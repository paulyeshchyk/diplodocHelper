#!/usr/bin/env node
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch {
  console.error(`[comments] node:sqlite недоступен. Нужен Node 24+. Текущий: ${process.version}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 5050;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'comments.db');
const TOKEN_FILE = path.join(DATA_DIR, 'admin-token.txt');
const ADMIN_DIR = path.join(__dirname, 'admin');
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const SEED_FILE = path.join(__dirname, 'allowed-emails.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let MODERATOR_TOKEN = process.env.MODERATOR_TOKEN || '';
if (!MODERATOR_TOKEN && fs.existsSync(TOKEN_FILE)) {
  MODERATOR_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
}

// ---------- БД ----------
const db = new DatabaseSync(DB_FILE);
db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id           TEXT PRIMARY KEY,
    page_path    TEXT NOT NULL,
    anchor       TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'open',
    orphaned_at  TEXT,
    created_at   TEXT NOT NULL,
    resolved_at  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_threads_page_status ON threads(page_path, status);

  CREATE TABLE IF NOT EXISTS comments (
    id            TEXT PRIMARY KEY,
    thread_id     TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    author_name   TEXT,
    author_email  TEXT,
    body          TEXT NOT NULL,
    basis         TEXT,
    is_moderator  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_id, created_at);

  CREATE TABLE IF NOT EXISTS allowed_emails (
    email         TEXT PRIMARY KEY COLLATE NOCASE,
    note          TEXT,
    claim_code    TEXT NOT NULL,
    claimed_at    TEXT,
    banned_at     TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash    TEXT PRIMARY KEY,
    email         TEXT NOT NULL COLLATE NOCASE,
    created_at    TEXT NOT NULL,
    last_used_at  TEXT NOT NULL,
    revoked_at    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
`);

// миграция
try { db.exec(`ALTER TABLE comments ADD COLUMN comment_type TEXT`); } catch { }
try { db.exec(`ALTER TABLE comments ADD COLUMN author_email TEXT`); } catch { }
try { db.exec(`ALTER TABLE comments ADD COLUMN basis TEXT`); } catch { }

const stmts = {
  insertThread: db.prepare(`INSERT INTO threads (id, page_path, anchor, status, created_at) VALUES (?, ?, ?, 'open', ?)`),
  insertComment: db.prepare(`INSERT INTO comments (id, thread_id, author_name, author_email, body, basis, comment_type, is_moderator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  threadsByPage: db.prepare(`SELECT * FROM threads WHERE page_path = ? ORDER BY created_at DESC`),
  allThreads: db.prepare(`SELECT * FROM threads ORDER BY created_at DESC`),
  threadById: db.prepare(`SELECT * FROM threads WHERE id = ?`),
  commentsByThread: db.prepare(`SELECT * FROM comments WHERE thread_id = ? ORDER BY created_at ASC`),
  updateThreadStatus: db.prepare(`UPDATE threads SET status = ?, resolved_at = ? WHERE id = ?`),
  markOrphaned: db.prepare(`UPDATE threads SET orphaned_at = COALESCE(orphaned_at, ?) WHERE id = ?`),
  resetOrphaned: db.prepare(`UPDATE threads SET orphaned_at = NULL WHERE id = ?`),

  getAllowedEmail: db.prepare(`SELECT * FROM allowed_emails WHERE email = ?`),
  getAllAllowedEmails: db.prepare(`SELECT * FROM allowed_emails ORDER BY email`),
  insertAllowedEmail: db.prepare(`INSERT INTO allowed_emails (email, note, claim_code, created_at) VALUES (?, ?, ?, ?)`),
  claimEmail: db.prepare(`UPDATE allowed_emails SET claimed_at = ? WHERE email = ?`),
  resetEmail: db.prepare(`UPDATE allowed_emails SET claimed_at = NULL, claim_code = ? WHERE email = ?`),
  banEmail: db.prepare(`UPDATE allowed_emails SET banned_at = ? WHERE email = ?`),
  unbanEmail: db.prepare(`UPDATE allowed_emails SET banned_at = NULL WHERE email = ?`),

  insertSession: db.prepare(`INSERT INTO sessions (token_hash, email, created_at, last_used_at) VALUES (?, ?, ?, ?)`),
  getSession: db.prepare(`SELECT * FROM sessions WHERE token_hash = ?`),
  touchSession: db.prepare(`UPDATE sessions SET last_used_at = ? WHERE token_hash = ?`),
  revokeSessionsByEmail: db.prepare(`UPDATE sessions SET revoked_at = ? WHERE email = ? AND revoked_at IS NULL`),
  sessionCounts: db.prepare(`SELECT email, COUNT(*) AS cnt FROM sessions WHERE revoked_at IS NULL GROUP BY email`),
  sessionLast: db.prepare(`SELECT email, MAX(last_used_at) AS last FROM sessions WHERE revoked_at IS NULL GROUP BY email`),
};

// ---------- helpers ----------
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function normalizePagePath(p) {
  let s = String(p || '').split('?')[0].split('#')[0];
  try { s = decodeURIComponent(s); } catch { }
  if (s.endsWith('/index.html')) s = s.slice(0, -'index.html'.length);
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s || '/';
}
function validateAnchor(a) {
  if (!a || typeof a !== 'object') return null;
  const quote = String(a.quote || '').trim();
  if (!quote) return null;
  return {
    quote,
    prefix: String(a.prefix || ''),
    suffix: String(a.suffix || ''),
    startOffset: Number.isFinite(a.startOffset) ? a.startOffset : null,
    endOffset: Number.isFinite(a.endOffset) ? a.endOffset : null,
    xpath: typeof a.xpath === 'string' ? a.xpath : null,
  };
}
function readJsonBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload_too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(!chunks.length ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) };
  const prev = res.getHeader('Set-Cookie');
  if (prev) headers['Set-Cookie'] = prev;
  res.writeHead(status, headers);
  res.end(body);
}

// ---------- auth ----------
function tokenMac() { return crypto.createHmac('sha256', MODERATOR_TOKEN || 'x').update('admin').digest('hex'); }
function isModerator(req) {
  if (!MODERATOR_TOKEN) return false;
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)gulf_admin=([a-f0-9]+)/);
  if (!m) return false;
  const expected = Buffer.from(tokenMac(), 'hex');
  let provided;
  try { provided = Buffer.from(m[1], 'hex'); } catch { return false; }
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}
function setAdminCookie(res) {
  res.setHeader('Set-Cookie', `gulf_admin=${tokenMac()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
}
function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', `gulf_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function generateSessionToken() { return crypto.randomBytes(32).toString('hex'); }
function generateClaimCode() {
  const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; const buf = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) s += AB[buf[i] % AB.length];
  return s;
}
function getBearerToken(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+([a-f0-9]+)$/i);
  return m ? m[1] : null;
}
function validateSession(token) {
  if (!token) return null;
  const hash = hashToken(token);
  const sess = stmts.getSession.get(hash);
  if (!sess) return null;
  if (sess.revoked_at) return null;
  return sess;
}
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a); const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ---------- rate limiting ----------
const rateLimits = new Map();
function checkRateLimit(key, maxPerWindow, windowMs) {
  const nowMs = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt < nowMs) {
    rateLimits.set(key, { count: 1, resetAt: nowMs + windowMs });
    return true;
  }
  if (entry.count >= maxPerWindow) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const t = Date.now();
  for (const [k, v] of rateLimits) if (v.resetAt < t) rateLimits.delete(k);
}, 60_000).unref?.();

// ---------- thread serialization ----------
function threadToJson(t, opts = {}) {
  const { withComments = true, withEmail = false } = opts;
  const obj = {
    id: t.id, page_path: t.page_path, anchor: JSON.parse(t.anchor),
    status: t.status, orphaned_at: t.orphaned_at, created_at: t.created_at, resolved_at: t.resolved_at,
  };
  if (withComments) {
    obj.comments = stmts.commentsByThread.all(t.id).map(c => {
      const cm = {
        id: c.id, thread_id: c.thread_id, author_name: c.author_name,
        body: c.body, basis: c.basis, comment_type: c.comment_type,
        is_moderator: !!c.is_moderator, created_at: c.created_at,
      };
      if (withEmail) cm.author_email = c.author_email || null;
      return cm;
    });
  }
  return obj;
}

// ---------- API ----------
async function handleApi(req, res, url) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, ts: now(), adminConfigured: !!MODERATOR_TOKEN, emailVerificationRequired: true });
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const bearer = getBearerToken(req);
    if (!bearer) return sendJson(res, 401, { error: 'no_token' });
    const sess = validateSession(bearer);
    if (!sess) return sendJson(res, 401, { error: 'invalid_session' });
    stmts.touchSession.run(now(), sess.token_hash);
    return sendJson(res, 200, { email: sess.email });
  }

  if (url.pathname === '/api/threads' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const isMod = isModerator(req);

    if (!isMod) {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(`threads:${ip}`, 60, 60 * 60_000)) return sendJson(res, 429, { error: 'rate_limit' });
    }

    let email = null; let sessionToken = null; let isModComment = false;

    if (isMod) {
      isModComment = true;
    } else {
      const bearer = getBearerToken(req);
      if (bearer) {
        const sess = validateSession(bearer);
        if (!sess) return sendJson(res, 401, { error: 'invalid_session' });
        email = sess.email;
        stmts.touchSession.run(now(), sess.token_hash);
      } else {
        const emailInput = String(body.email || '').trim().toLowerCase();
        const codeInput = String(body.claim_code || '').trim();
        if (!emailInput) return sendJson(res, 403, { error: 'email_required' });
        if (!codeInput) return sendJson(res, 403, { error: 'claim_code_required' });

        const allowed = stmts.getAllowedEmail.get(emailInput);
        if (!allowed) return sendJson(res, 403, { error: 'email_not_allowed' });
        if (allowed.banned_at) return sendJson(res, 403, { error: 'banned' });
        if (allowed.claimed_at) return sendJson(res, 403, { error: 'email_in_use' });
        if (!timingSafeEqualStr(allowed.claim_code || '', codeInput)) return sendJson(res, 403, { error: 'bad_code' });

        sessionToken = generateSessionToken();
        const ts0 = now();
        try {
          db.exec('BEGIN');
          stmts.insertSession.run(hashToken(sessionToken), allowed.email, ts0, ts0);
          stmts.claimEmail.run(ts0, allowed.email);
          db.exec('COMMIT');
        } catch (e) { try { db.exec('ROLLBACK'); } catch { } throw e; }
        email = allowed.email;
      }
    }

    const pagePath = normalizePagePath(body.page_path);
    const anchor = validateAnchor(body.anchor);
    const commentBody = String(body.body || '').trim().slice(0, 4000);
    const authorNameIn = body.author_name ? String(body.author_name).trim().slice(0, 100) || null : null;
    const basis = String(body.source_document || '').trim().slice(0, 500) || null;
    const commentType = body.comment_type === 'document' ? 'document' : 'grammar';

    if (!anchor) return sendJson(res, 400, { error: 'invalid_anchor' });
    if (!commentBody) return sendJson(res, 400, { error: 'empty_body' });

    let displayName = authorNameIn;
    if (!displayName && email) displayName = email.split('@')[0];
    if (isModComment) displayName = displayName || 'Технический писатель';

    const threadId = uuid(), commentId = uuid(), ts = now();
    try {
      db.exec('BEGIN');
      stmts.insertThread.run(threadId, pagePath, JSON.stringify(anchor), ts);
      stmts.insertComment.run(commentId, threadId, displayName, email, commentBody, basis, commentType, isModComment ? 1 : 0, ts);
      db.exec('COMMIT');
    } catch (e) { try { db.exec('ROLLBACK'); } catch { } throw e; }

    const response = { thread: threadToJson(stmts.threadById.get(threadId)) };
    if (sessionToken) response.session_token = sessionToken;
    return sendJson(res, 201, response);
  }

  if (url.pathname === '/api/threads' && req.method === 'GET') {
    const mod = isModerator(req);
    if (url.searchParams.get('all') === '1') {
      if (!mod) return sendJson(res, 401, { error: 'unauthorized' });
      return sendJson(res, 200, { threads: stmts.allThreads.all().map(t => threadToJson(t, { withEmail: true })), isModerator: true });
    }
    const pagePath = normalizePagePath(url.searchParams.get('page_path'));
    return sendJson(res, 200, { threads: stmts.threadsByPage.all(pagePath).map(t => threadToJson(t)), isModerator: mod });
  }

  if (url.pathname === '/api/comments' && req.method === 'POST') {
    if (!isModerator(req)) return sendJson(res, 401, { error: 'unauthorized' });
    const body = await readJsonBody(req);
    const threadId = String(body.thread_id || '');
    const text = String(body.body || '').trim().slice(0, 4000);
    const basis = String(body.basis || '').trim().slice(0, 500) || null;
    const authorName = body.author_name ? String(body.author_name).slice(0, 100).trim() || null : null;
    if (!threadId) return sendJson(res, 400, { error: 'no_thread' });
    if (!text) return sendJson(res, 400, { error: 'empty_body' });
    if (!stmts.threadById.get(threadId)) return sendJson(res, 404, { error: 'not_found' });
    const cid = uuid(), ts = now();
    stmts.insertComment.run(cid, threadId, authorName || 'Технический писатель', null, text, basis, 'grammar', 1, ts);
    return sendJson(res, 201, {
      comment: {
        id: cid, thread_id: threadId, author_name: authorName || 'Технический писатель',
        body: text, basis, is_moderator: true, created_at: ts, author_email: null,
      }
    });
  }

  const patchMatch = url.pathname.match(/^\/api\/threads\/([0-9a-f-]+)$/i);
  if (patchMatch && req.method === 'PATCH') {
    if (!isModerator(req)) return sendJson(res, 401, { error: 'unauthorized' });
    const body = await readJsonBody(req);
    const id = patchMatch[1];
    if (!stmts.threadById.get(id)) return sendJson(res, 404, { error: 'not_found' });
    if (body.status && ['open', 'resolved', 'archived'].includes(body.status)) {
      stmts.updateThreadStatus.run(body.status, body.status === 'resolved' ? now() : null, id);
    }
    if (body.orphaned_at === null) stmts.resetOrphaned.run(id);
    return sendJson(res, 200, { thread: threadToJson(stmts.threadById.get(id), { withEmail: true }) });
  }

  const orphMatch = url.pathname.match(/^\/api\/threads\/([0-9a-f-]+)\/orphaned$/i);
  if (orphMatch && req.method === 'POST') {
    stmts.markOrphaned.run(now(), orphMatch[1]);
    return sendJson(res, 200, { ok: true });
  }
  if (orphMatch && req.method === 'DELETE') {
    stmts.resetOrphaned.run(orphMatch[1]);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/emails' && req.method === 'GET') {
    if (!isModerator(req)) return sendJson(res, 401, { error: 'unauthorized' });
    const counts = {}, lasts = {};
    for (const r of stmts.sessionCounts.all()) counts[r.email] = r.cnt;
    for (const r of stmts.sessionLast.all()) lasts[r.email] = r.last;
    const emails = stmts.getAllAllowedEmails.all().map(e => ({
      email: e.email, note: e.note, claim_code: e.claimed_at ? null : e.claim_code,
      claimed_at: e.claimed_at, banned_at: e.banned_at, created_at: e.created_at,
      sessions: counts[e.email] || 0, last_activity: lasts[e.email] || null,
    }));
    return sendJson(res, 200, { emails });
  }

  if (url.pathname === '/api/admin/emails' && req.method === 'POST') {
    if (!isModerator(req)) return sendJson(res, 401, { error: 'unauthorized' });
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const note = body.note ? String(body.note).slice(0, 200) : null;
    if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'invalid_email' });
    if (stmts.getAllowedEmail.get(email)) return sendJson(res, 409, { error: 'already_exists' });
    const code = generateClaimCode();
    stmts.insertAllowedEmail.run(email, note, code, now());
    return sendJson(res, 201, { email, note, claim_code: code });
  }

  const emailMatch = url.pathname.match(/^\/api\/admin\/emails\/([^/]+)$/);
  if (emailMatch && req.method === 'PATCH') {
    if (!isModerator(req)) return sendJson(res, 401, { error: 'unauthorized' });
    const email = decodeURIComponent(emailMatch[1]).toLowerCase();
    const body = await readJsonBody(req);
    const action = body.action;
    const allowed = stmts.getAllowedEmail.get(email);
    if (!allowed) return sendJson(res, 404, { error: 'not_found' });

    if (action === 'reset') {
      const code = generateClaimCode();
      stmts.resetEmail.run(code, email);
      stmts.revokeSessionsByEmail.run(now(), email);
      return sendJson(res, 200, { ok: true, email, claim_code: code });
    }
    if (action === 'ban') {
      stmts.banEmail.run(now(), email);
      stmts.revokeSessionsByEmail.run(now(), email);
      return sendJson(res, 200, { ok: true });
    }
    if (action === 'unban') {
      stmts.unbanEmail.run(email);
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 400, { error: 'bad_action' });
  }

  return sendJson(res, 404, { error: 'not_found' });
}

// ---------- /admin/* ----------
async function handleAdmin(req, res, url) {
  if (url.pathname === '/admin/login' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const pwd = String(body.password || '');
    if (!MODERATOR_TOKEN) {
      const newToken = crypto.randomBytes(32).toString('hex');
      MODERATOR_TOKEN = newToken;
      fs.writeFileSync(TOKEN_FILE, newToken, { mode: 0o600 });
      setAdminCookie(res);
      return sendJson(res, 200, { ok: true, token: newToken, warn: 'admin was unconfigured, token created' });
    }
    if (pwd.length !== MODERATOR_TOKEN.length) return sendJson(res, 401, { error: 'bad_password' });
    const ok = crypto.timingSafeEqual(Buffer.from(pwd), Buffer.from(MODERATOR_TOKEN));
    if (!ok) return sendJson(res, 401, { error: 'bad_password' });
    setAdminCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/admin/logout' && req.method === 'POST') {
    clearAdminCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/admin/status' && req.method === 'GET') {
    return sendJson(res, 200, { configured: !!MODERATOR_TOKEN, authenticated: isModerator(req) });
  }

  if (url.pathname === '/admin/rotate' && req.method === 'POST') {
    if (!isModerator(req)) return sendJson(res, 401, { error: 'unauthorized' });
    const newToken = crypto.randomBytes(32).toString('hex');
    MODERATOR_TOKEN = newToken;
    fs.writeFileSync(TOKEN_FILE, newToken, { mode: 0o600 });
    setAdminCookie(res);
    return sendJson(res, 200, { ok: true, token: newToken });
  }

  // --- Статика админки ---
  if (url.pathname.startsWith('/admin') && req.method === 'GET') {
    let relPath = url.pathname.replace(/^\/admin\/?/, '');
    if (relPath === '') relPath = 'index.html';
    const fullPath = path.join(ADMIN_DIR, relPath);

    if (!fullPath.startsWith(ADMIN_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

    fs.stat(fullPath, (err, stat) => {
      if (!err && stat.isFile()) return sendFile(res, fullPath, stat);
      res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found');
    });
    return;
  }

  return sendJson(res, 404, { error: 'not_found' });
}

// ---------- статика сайта ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
};
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = url.pathname; }
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const normalized = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(BUILD_DIR, normalized);
  if (!fullPath.startsWith(BUILD_DIR + path.sep) && fullPath !== BUILD_DIR) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(fullPath, (err, stat) => {
    if (!err && stat.isFile()) return sendFile(res, fullPath, stat);
    if (!err && stat.isDirectory()) {
      const index = path.join(fullPath, 'index.html');
      return fs.stat(index, (e2, s2) => {
        if (!e2 && s2.isFile()) return sendFile(res, index, s2);
        res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found');
      });
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found');
  });
}
function sendFile(res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
  if (ext === '.html') headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  fs.createReadStream(filePath).pipe(res);
}

// ---------- seed ----------
function seedAllowedEmails() {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM allowed_emails`).get().n;
  if (count > 0) return;
  if (!fs.existsSync(SEED_FILE)) return;
  try {
    const list = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    if (!Array.isArray(list)) throw new Error('ожидался массив');
    const ts = now();
    console.log(`[allow] Инициализация email из seed (${list.length}):`);
    for (const item of list) {
      const email = String(item.email || '').trim().toLowerCase();
      if (!email.includes('@')) continue;
      const note = item.note ? String(item.note).slice(0, 200) : null;
      const code = generateClaimCode();
      stmts.insertAllowedEmail.run(email, note, code, ts);
      console.log(`[allow] ${email.padEnd(30)} code=${code}  ${note || ''}`);
    }
  } catch (e) { console.error(`[allow] Ошибка seed: ${e.message}`); }
}
seedAllowedEmails();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/admin')) await handleAdmin(req, res, url);
    else if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    console.error('[comments] fatal:', e);
    if (!res.headersSent) sendJson(res, 500, { error: 'internal' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[comments] listening on :${PORT}`);
  console.log(`[comments] Available on http://localhost:${PORT}`);
  console.log(`[comments] moderator token: ${MODERATOR_TOKEN ? 'set' : 'NOT SET'}`);
});