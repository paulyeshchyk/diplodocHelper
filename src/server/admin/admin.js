(async function () {
  'use strict';
  const state = { threads: [], filter: 'open', isMod: false };

  async function loadTemplates() {
    const names = ['card', 'msg', 'email-row', 'modal-add-email'];
    for (const name of names) {
      try {
        const res = await fetch(`/admin/templates/${name}.html`);
        if (res.ok) {
          const text = await res.text();
          const el = document.createElement('script');
          el.type = 'text/template';
          el.id = `tpl-${name}`;
          el.textContent = text;
          document.body.appendChild(el);
        }
      } catch (e) { console.warn(`[admin] failed to load template ${name}`, e); }
    }
  }

  function renderTemplate(name, data) {
    const el = document.getElementById('tpl-' + name);
    if (!el) return '';
    const tpl = el.textContent;
    return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => data[k] != null ? String(data[k]) : '');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: 'include', ...opts });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
    return r.json();
  }

  // --- Notifications ---
  const notify = {
    enabled: false, knownIds: new Set(),
    init() {
      this.enabled = localStorage.getItem('dl-admin-notify') !== 'false';
      try { this.knownIds = new Set(JSON.parse(localStorage.getItem('dl-admin-knownIds') || '[]')); } catch { this.knownIds = new Set(); }
      updateNotifyBtn();
    },
    save() { try { localStorage.setItem('dl-admin-knownIds', JSON.stringify([...this.knownIds])); } catch { } },
    async enable() {
      if (!('Notification' in window)) { alert('Браузер не поддерживает уведомления'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { alert('Уведомления запрещены в настройках браузера'); return; }
      this.enabled = true; localStorage.setItem('dl-admin-notify', 'true'); updateNotifyBtn();
    },
    disable() { this.enabled = false; localStorage.setItem('dl-admin-notify', 'false'); updateNotifyBtn(); },
    check(threads) {
      const fresh = threads.filter(t => !this.knownIds.has(t.id));
      for (const t of threads) this.knownIds.add(t.id);
      this.save();
      const openFresh = fresh.filter(t => t.status === 'open');
      if (!openFresh.length) return;
      this.updateTitle(openFresh.length);
      this.beep();
      if (this.enabled && Notification.permission === 'granted') this.show(openFresh);
    },
    show(threads) {
      if (threads.length === 1) {
        const t = threads[0], first = (t.comments && t.comments[0]) || {};
        const n = new Notification('💬 ' + (first.author_name || 'Аноним') + ' · ' + t.page_path, { body: (first.body || '').slice(0, 140), tag: 'dl-thread-' + t.id, silent: true });
        n.onclick = () => { window.focus(); location.hash = '#' + t.id; n.close(); };
        return;
      }
      const n = new Notification('📬 Новые комментарии: ' + threads.length, { body: 'Откройте админку для ответа', tag: 'dl-admin-comments', silent: true });
      n.onclick = () => { window.focus(); n.close(); };
    },
    beep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15); o.start(); o.stop(ctx.currentTime + 0.2);
      } catch { }
    },
    updateTitle(n) {
      const original = document.title.replace(/^\(\d+\)\s*/, '');
      document.title = `(${n}) ${original}`;
      const reset = () => { document.title = original; window.removeEventListener('focus', reset); };
      window.addEventListener('focus', reset);
    }
  };

  function updateNotifyBtn() {
    const btn = document.getElementById('notify-btn');
    if (!btn) return;
    btn.textContent = notify.enabled ? '🔔 Уведомления: вкл' : '🔕 Уведомления: выкл';
  }

  // --- Deep-link ---
  function scrollToHashThread() {
    const id = location.hash.replace(/^#/, '').trim();
    if (!id || !/^[0-9a-f-]+$/i.test(id)) return;
    if (state.filter !== 'all') {
      state.filter = 'all';
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
      render();
    }
    const card = document.querySelector(`[data-thread-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('thread-card--flash');
    setTimeout(() => card.classList.remove('thread-card--flash'), 3000);
  }

  // --- Boot & Data ---
  async function boot() {
    await loadTemplates();
    const s = await api('/admin/status');
    document.getElementById('login-view').hidden = s.authenticated;
    document.getElementById('app-view').hidden = !s.authenticated;
    document.getElementById('logout-btn').hidden = !s.authenticated;
    state.isMod = s.authenticated;

    if (!s.configured) {
      const w = document.getElementById('login-warn');
      w.hidden = false;
      w.textContent = 'ADMIN не настроен. Первый вход создаст токен и покажет его — сохраните.';
    }
    if (s.authenticated) {
      notify.init();
      await loadThreads();
      notify.check(state.threads);
      startPolling();
      scrollToHashThread();
    }
  }

  let pollTimer = null;
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await api('/api/threads?all=1');
        state.threads = data.threads;
        render();
        notify.check(state.threads);
        scrollToHashThread();
      } catch { }
    }, 30_000);

    window.addEventListener('focus', async () => {
      try {
        const data = await api('/api/threads?all=1');
        state.threads = data.threads;
        render();
        notify.check(state.threads);
      } catch { }
    });
    window.addEventListener('hashchange', scrollToHashThread);
  }

  async function loadThreads() {
    const data = await api('/api/threads?all=1');
    state.threads = data.threads;
    render();
  }

  // --- Rendering ---
  function render() {
    const root = document.getElementById('threads');
    let list = state.threads;
    if (state.filter === 'orphaned') list = list.filter(t => t.orphaned_at);
    else if (state.filter !== 'all') list = list.filter(t => t.status === state.filter && !t.orphaned_at);

    if (!list.length) {
      root.innerHTML = '<p style="text-align:center;color:#57606a;padding:40px 0;">Нет тредов.</p>';
      return;
    }
    root.innerHTML = '';
    for (const t of list) root.appendChild(renderCard(t));
  }

  function renderCard(t) {
    const card = document.createElement('div');
    card.dataset.threadId = t.id;
    card.className = 'thread-card';

    const statusLabel = t.status === 'resolved' ? '✅ Разрешён' : t.status === 'archived' ? '📦 Архив' : '🟡 Открыт';
    const orph = t.orphaned_at ? ' ⚠️ Сирота' : '';

    card.innerHTML = renderTemplate('card', {
      STATUS_LABEL: statusLabel + orph,
      PAGE_PATH: esc(t.page_path),
      CREATED: esc(new Date(t.created_at).toLocaleString()),
      QUOTE: esc(t.anchor.quote || '').slice(0, 300) + ((t.anchor.quote || '').length > 300 ? '…' : ''),
      RESOLVE_DISABLED: t.status === 'resolved' ? 'disabled' : '',
      REOPEN_DISABLED: t.status !== 'resolved' ? 'disabled' : '',
      ARCHIVE_DISABLED: t.status === 'archived' ? 'disabled' : '',
    });

    const commentsRoot = card.querySelector('.thread-card__comments');
    for (const c of t.comments) {
      const div = document.createElement('div');
      div.className = 'msg' + (c.is_moderator ? ' msg--mod' : '');
      const author = c.author_name || (c.is_moderator ? 'Технический писатель' : 'Аноним');
      const emailBadge = c.author_email ? ` <span class="msg__email" title="email">${esc(c.author_email)}</span>` : '';

      let typeBadge = '';
      if (c.comment_type === 'document') {
        typeBadge = `<div class="msg__type-badge msg__type-badge--doc">⚠️ Несоответствие документу-первоисточнику</div>`;
      }

      let basisBlock = '';
      if (c.basis) {
        const isUrl = /^https?:\/\//i.test(c.basis);
        const basisContent = isUrl ? `<a href="${esc(c.basis)}" target="_blank">${esc(c.basis)}</a>` : esc(c.basis).replace(/\n/g, '<br>');
        basisBlock = `<div class="msg__basis"><b>Документ источник:</b> ${basisContent}</div>`;
      }

      div.innerHTML = renderTemplate('msg', {
        AUTHOR: esc(author),
        EMAIL_BADGE: emailBadge,
        TIME: esc(new Date(c.created_at).toLocaleString()),
        MOD_LABEL: c.is_moderator ? ' · техпис' : '',
        BODY: esc(c.body),
        TYPE_BADGE: typeBadge,
        BASIS_BLOCK: basisBlock
      });
      commentsRoot.appendChild(div);
    }

    const ta = card.querySelector('textarea');
    const basisInput = card.querySelector('.basis-input');
    const nameInput = card.querySelector('.name-input');
    const resolveOnReply = card.querySelector('.resolve-on-reply');
    const replyBtn = card.querySelector('.reply-btn');
    const resolveBtn = card.querySelector('.resolve-btn');
    const reopenBtn = card.querySelector('.reopen-btn');
    const archiveBtn = card.querySelector('.archive-btn');

    replyBtn.addEventListener('click', async () => {
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      replyBtn.disabled = true;
      try {
        await api('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: t.id,
            body: text,
            basis: basisInput.value.trim() || null,
            author_name: nameInput.value.trim() || null
          }),
        });
        if (resolveOnReply.checked) {
          await api(`/api/threads/${t.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' }),
          });
        }
        await loadThreads();
      } catch (e) { alert('Ошибка: ' + e.message); replyBtn.disabled = false; }
    });

    async function setStatus(s) {
      try {
        await api(`/api/threads/${t.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: s }),
        });
        await loadThreads();
      } catch (e) { alert(e.message); }
    }
    resolveBtn.addEventListener('click', () => setStatus('resolved'));
    reopenBtn.addEventListener('click', () => setStatus('open'));
    archiveBtn.addEventListener('click', () => setStatus('archived'));

    return card;
  }

  // --- Emails ---
  async function loadEmails() {
    const tbody = document.getElementById('emails-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#57606a;">Загрузка…</td></tr>';
    try {
      const data = await api('/api/admin/emails');
      if (!data.emails.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#57606a;padding:30px;">Пусто. Нажмите «Добавить email».</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      for (const e of data.emails) {
        const tr = document.createElement('tr');

        let status = '';
        if (e.banned_at) status = '<span class="badge badge--banned">забанен</span>';
        else if (e.claimed_at) status = '<span class="badge badge--active">активен</span>';
        else status = '<span class="badge badge--free">свободен</span>';

        tr.innerHTML = renderTemplate('email-row', {
          EMAIL: esc(e.email),
          NOTE: esc(e.note || ''),
          STATUS: status,
          CODE: e.claim_code ? `<code>${esc(e.claim_code)}</code>` : '<span style="color:#57606a">—</span>',
          SESSIONS: e.sessions,
          LAST_ACTIVE: e.last_activity ? esc(new Date(e.last_activity).toLocaleString()) : '<span style="color:#57606a">—</span>'
        });

        const actions = tr.querySelector('.actions');

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Сбросить';
        resetBtn.addEventListener('click', async () => {
          if (!confirm(`Сбросить «${e.email}»? Все сессии будут отозваны, будет выдан новый код.`)) return;
          try {
            const res = await api(`/api/admin/emails/${encodeURIComponent(e.email)}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reset' }),
            });
            alert(`Новый код для ${e.email}:\n\n${res.claim_code}\n\nПередайте пользователю лично.`);
            await loadEmails();
          } catch (err) { alert('Ошибка: ' + err.message); }
        });
        actions.appendChild(resetBtn);

        if (e.banned_at) {
          const unban = document.createElement('button');
          unban.textContent = 'Разбанить';
          unban.addEventListener('click', async () => {
            try { await api(`/api/admin/emails/${encodeURIComponent(e.email)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unban' }) }); await loadEmails(); }
            catch (err) { alert('Ошибка: ' + err.message); }
          });
          actions.appendChild(unban);
        } else {
          const ban = document.createElement('button');
          ban.textContent = 'Забанить'; ban.className = 'danger';
          ban.addEventListener('click', async () => {
            if (!confirm(`Забанить «${e.email}»? Сессии будут отозваны.`)) return;
            try { await api(`/api/admin/emails/${encodeURIComponent(e.email)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ban' }) }); await loadEmails(); }
            catch (err) { alert('Ошибка: ' + err.message); }
          });
          actions.appendChild(ban);
        }

        tbody.appendChild(tr);
      }
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:#cf222e;">Ошибка: ${esc(e.message)}</td></tr>`;
    }
  }

  // --- Event Listeners ---
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('login-password').value;
    try {
      const res = await api('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
      if (res.token) alert('ADMIN не был настроен. Создан токен, сохраните его:\n\n' + res.token + '\n\nОн также сохранён в data/admin-token.txt');
      await boot();
    } catch { document.getElementById('login-error').textContent = 'Неверный пароль'; }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => { await api('/admin/logout', { method: 'POST' }); await boot(); });

  document.getElementById('rotate-btn').addEventListener('click', async () => {
    if (!confirm('Ротация токена инвалидирует все текущие сессии (включая эту) до следующего входа. Продолжить?')) return;
    try {
      const res = await api('/admin/rotate', { method: 'POST' });
      const banner = document.getElementById('new-token-banner');
      banner.hidden = false; banner.textContent = 'Новый токен (сохраните, старый больше не действует): ' + res.token;
    } catch (e) { alert(e.message); }
  });

  document.getElementById('refresh-btn').addEventListener('click', loadThreads);
  document.getElementById('refresh-emails-btn').addEventListener('click', loadEmails);

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });
  });

  document.querySelectorAll('.admin-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('tab-threads').hidden = tab !== 'threads';
      document.getElementById('tab-emails').hidden = tab !== 'emails';
      if (tab === 'emails') loadEmails();
    });
  });

  document.getElementById('notify-btn').addEventListener('click', () => { if (notify.enabled) notify.disable(); else notify.enable(); });

  document.getElementById('add-email-btn').addEventListener('click', () => {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = renderTemplate('modal-add-email', {});
    document.body.appendChild(ov);

    ov.querySelector('#m-email').focus();
    ov.querySelector('#m-cancel').addEventListener('click', () => ov.remove());
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.remove(); });

    ov.querySelector('#m-add').addEventListener('click', async () => {
      const email = ov.querySelector('#m-email').value.trim();
      const note = ov.querySelector('#m-note').value.trim() || null;
      if (!email || !email.includes('@')) { alert('Введите корректный email'); return; }
      try {
        const res = await api('/api/admin/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, note }) });
        ov.querySelector('#m-result').innerHTML = `<div class="modal-result">Код для ${esc(res.email)}: <b>${esc(res.claim_code)}</b><br>Передайте пользователю лично.</div>`;
        ov.querySelector('#m-add').disabled = true;
        await loadEmails();
      } catch (err) { alert('Ошибка: ' + err.message); }
    });
  });

  boot().catch(e => {
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = 'Ошибка: ' + e.message;
  });
})();