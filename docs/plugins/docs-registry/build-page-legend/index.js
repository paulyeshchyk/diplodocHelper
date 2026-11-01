#!/usr/bin/env node
'use strict';

require('../_paths.js')

const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const { DOCS_DIR, GENERATED_DIR, REGISTRY_DIR } = require('../_paths.js');

const HELP = `
Использование: node build-page-legend.js [dir] [options]

Опции:
  --lang=<ru|en>        язык (по умолчанию ru). Если dir не указан, берётся <docs>/<lang>/Модули
  --catalog=<path>      catalog.json (по умолчанию <docs>/_generated/catalog.<lang>.json)
  --skip-unknown        не падать на неизвестных slug (рендерить как \\\`код\\\`)
  --rewrite             перезаписывать page-legend.md
  --with-include        добавлять {% include [legend](./page-legend.md) %} в index.md модуля
  --order=<mode>        custom | ascending | descending | none  (по умолчанию custom)
  --ignore=<list>       свойства через запятую, не попадут в legend
  --dry-run             ничего не писать
  --verbose             подробный вывод
  -h, --help            справка
`;

function parseArgv(argv) {
  const opts = {
    rootDir: null, lang: 'ru', catalog: null, skipUnknown: false, rewrite: false,
    withInclude: false, order: 'custom', ignore: new Set(),
    dryRun: false, verbose: false, help: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-unknown') opts.skipUnknown = true;
    else if (a === '--rewrite') opts.rewrite = true;
    else if (a === '--with-include') opts.withInclude = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--lang=')) opts.lang = a.slice('--lang='.length);
    else if (a === '--lang') opts.lang = argv[++i];
    else if (a.startsWith('--catalog=')) opts.catalog = a.slice('--catalog='.length);
    else if (a === '--catalog') opts.catalog = argv[++i];
    else if (a.startsWith('--order=')) opts.order = a.slice('--order='.length);
    else if (a === '--order') opts.order = argv[++i];
    else if (a.startsWith('--ignore=')) opts.ignore = splitList(a.slice('--ignore='.length));
    else if (a === '--ignore') opts.ignore = splitList(argv[++i]);
    else if (!a.startsWith('-')) positional.push(a);
    else throw new Error(`Неизвестная опция: ${a}`);
  }
  if (positional[0]) opts.rootDir = positional[0];
  const allowed = new Set(['custom', 'ascending', 'descending', 'none']);
  if (!allowed.has(opts.order)) throw new Error(`--order: допустимо custom|ascending|descending|none`);
  return opts;
}

function splitList(s) { return new Set(String(s).split(',').map(x => x.trim()).filter(Boolean)); }

const PROPERTY_FORMAT = {
  ID: 'plain', pureTitle: 'plain', designation: 'plain',
  Идентификатор: 'backtick', layer: 'backtick', capability: 'backtick',
  family: 'backtick', folder: 'single', entrypoint: 'backtick', version: 'backtick',
};
const PROPERTY_TYPE = { layer: 'array', capability: 'array', family: 'array', folder: 'array' };
const PROPERTY_JOIN = { layer: ' / ', folder: ' + ' };
const DEFAULT_JOIN = ' + ';
const DIM_MAP = { family: 'family', layer: 'layer', capability: 'capability' };
const CUSTOM_ORDER = [
  'ID', 'ID_Group', 'ID_Type', 'Идентификатор', 'title', 'sectionType',
  'capability', 'family', 'layer', 'designation', 'folder', 'entrypoint', 'role', 'version',
];
const INCLUDE_LINE = '{% include [legend](./page-legend.md) %}';

function toPosix(p) { return p.split(path.sep).join('/'); }
async function fileExists(p) { try { await fs.access(p); return true; } catch { return false; } }

function splitFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { frontmatter: m[1], body: m[2] };
}

async function findIndexFiles(dir, results = []) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', '_generated', '_includes', '_registry'].includes(e.name)) continue;
      await findIndexFiles(full, results);
    } else if (e.isFile() && e.name === 'index.md') {
      if (!path.basename(dir).startsWith('Модуль')) continue;
      results.push(full);
    }
  }
  return results;
}

function stripExistingWrap(str) {
  const s = String(str).trim();
  if (s.length < 2) return s;
  const f = s[0], l = s[s.length - 1];
  if ((f === '`' || f === "'" || f === '"') && f === l) return s.slice(1, -1);
  return s;
}

function formatScalar(key, value) {
  if (value == null) return '';
  const str = typeof value === 'string' ? value : String(value);
  if (str.trim() === '') return '';
  const style = PROPERTY_FORMAT[key] || 'auto';
  switch (style) {
    case 'plain': return str;
    case 'backtick': return '`' + stripExistingWrap(str).replace(/`/g, '\\`') + '`';
    case 'single': return "'" + stripExistingWrap(str).replace(/'/g, "''") + "'";
    case 'double': return '"' + stripExistingWrap(str).replace(/"/g, '\\"') + '"';
    default: {
      if (/^'[\s\S]*'$/.test(str) || /^"[\s\S]*"$/.test(str) || /^`[\s\S]*`$/.test(str)) return str;
      if (typeof value === 'number' || typeof value === 'boolean') return str;
      if (/^-?\d+(\.\d+)?$/.test(str)) return str;
      if (!/\s/.test(str) && /^[\w./@{}\-:()]+$/i.test(str)) return '`' + str + '`';
      return str;
    }
  }
}

function parseArrayValue(value) {
  if (Array.isArray(value)) return value.map(v => (v == null ? '' : String(v))).filter(v => v.trim() !== '');
  if (value == null) return [];
  const s = String(value);
  if (s.trim() === '') return [];
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

function formatDimensionLink(ctx, dimName, slug) {
  const item = ctx.catalog?.dimensions?.[dimName]?.items?.[slug];
  if (!item) return null;
  const dimIndexRel = path.posix.join(item.dir, 'index.md');
  const relPath = path.posix.relative(ctx.moduleDirRel, dimIndexRel);
  return `[${slug}](${encodeURI(relPath)})`;
}

function formatLegendValue(key, value, ctx) {
  const dimName = DIM_MAP[key];
  if (dimName && ctx?.catalog) {
    const parts = parseArrayValue(value);
    if (parts.length === 0) return '';
    const sep = PROPERTY_JOIN[key] || DEFAULT_JOIN;
    return parts.map(slug => {
      const link = formatDimensionLink(ctx, dimName, slug);
      if (link === null) { ctx.unknowns.push({ field: key, dim: dimName, slug }); return '`' + slug + '`'; }
      return link;
    }).join(sep);
  }
  const type = PROPERTY_TYPE[key] || 'auto';
  if (type === 'array') {
    const parts = parseArrayValue(value);
    if (parts.length === 0) return '';
    if (parts.length === 1) return formatScalar(key, parts[0]);
    return parts.map(p => formatScalar(key, p)).join(PROPERTY_JOIN[key] || DEFAULT_JOIN);
  }
  return formatScalar(key, value);
}

function sortEntries(entries, order) {
  if (order === 'none') return entries;
  if (order === 'ascending') return [...entries].sort(([a], [b]) => String(a).localeCompare(String(b), 'ru'));
  if (order === 'descending') return [...entries].sort(([a], [b]) => String(b).localeCompare(String(a), 'ru'));
  const idx = new Map(CUSTOM_ORDER.map((k, i) => [k, i]));
  const known = [], unknown = [];
  for (const e of entries) (idx.has(e[0]) ? known : unknown).push(e);
  known.sort((a, b) => idx.get(a[0]) - idx.get(b[0]));
  return [...known, ...unknown];
}

function renderLegend(frontmatter, opts, ctx) {
  let entries = Object.entries(frontmatter);
  if (opts.ignore.size) entries = entries.filter(([k]) => !opts.ignore.has(k));
  entries = sortEntries(entries, opts.order);
  if (entries.length === 0) return null;
  const rows = entries.map(([k, v]) => [k, formatLegendValue(k, v, ctx)]);
  const col1W = Math.max(3, ...rows.map(([k]) => k.length));
  const col2W = Math.max(3, ...rows.map(([, v]) => v.length));
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
  const lines = [];
  lines.push(`| ${' '.repeat(col1W)} | ${' '.repeat(col2W)} |`);
  lines.push(`| ${'-'.repeat(col1W)} | ${'-'.repeat(col2W)} |`);
  for (const [k, v] of rows) lines.push(`| ${pad(k, col1W)} | ${pad(v, col2W)} |`);
  lines.push('');
  lines.push('{: .page-legend }');
  lines.push('');
  return lines.join('\n');
}

function ensureInclude(content) {
  if (content.includes(INCLUDE_LINE)) return { content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trimmed = content.replace(/\s+$/, '');
  return { content: trimmed + eol + eol + INCLUDE_LINE + eol, changed: true };
}

async function processFile(filePath, opts) {
  const raw = await fs.readFile(filePath, 'utf8');
  const hasBom = raw.charCodeAt(0) === 0xFEFF;
  const content = hasBom ? raw.slice(1) : raw;
  const parts = splitFrontmatter(content);
  if (!parts) return { status: 'skip', reason: 'нет frontmatter' };

  let fm;
  try { fm = yaml.load(parts.frontmatter) || {}; }
  catch (e) { return { status: 'error', reason: `невалидный YAML: ${e.message}` }; }
  if (typeof fm !== 'object' || Array.isArray(fm)) return { status: 'error', reason: 'frontmatter не объект' };

  const ctx = {
    catalog: opts._catalog,
    moduleDirRel: opts._catalog
      ? toPosix(path.relative(opts._catalog.docsRoot, path.dirname(filePath)))
      : null,
    unknowns: [],
  };

  const legendContent = renderLegend(fm, opts, ctx);
  if (legendContent === null) return { status: 'skip', reason: 'пусто после --ignore' };

  const legendPath = path.join(path.dirname(filePath), 'page-legend.md');
  const existing = (await fileExists(legendPath)) ? await fs.readFile(legendPath, 'utf8') : null;

  let action;
  if (existing === legendContent) action = 'unchanged';
  else if (existing !== null && !opts.rewrite) action = 'outdated';
  else action = existing !== null ? 'updated' : 'created';

  const inc = opts.withInclude ? ensureInclude(content) : { content, changed: false };

  return {
    status: 'ok', action, unknowns: ctx.unknowns,
    legendPath, legendContent,
    indexMdPath: inc.changed ? filePath : null,
    indexMdContent: inc.changed ? (hasBom ? '\uFEFF' : '') + inc.content : null,
  };
}

function printUnknownError(allUnknowns, registryPath) {
  const grouped = {};
  for (const u of allUnknowns) {
    const key = `${u.dim}.${u.slug}`;
    if (!grouped[key]) grouped[key] = { dim: u.dim, slug: u.slug, modules: [] };
    grouped[key].modules.push(u.file);
  }
  console.error(`\n❌ Ошибка валидации: ${allUnknowns.length} неизвестных значений в ${Object.keys(grouped).length} свойствах\n`);
  for (const g of Object.values(grouped)) {
    console.error(`  ${g.dim}: "${g.slug}" — в ${g.modules.length} модул.`);
    console.error(`    например: ${g.modules[0]}`);
  }
  console.error(`\n📖 Как исправить:`);
  console.error(`  1. Откройте ${registryPath}`);
  console.error(`  2. В dimensions.<dim>.items добавьте недостающие slug-ключи`);
  console.error(`     с полями dir и title.`);
  console.error(`  3. Или исправьте frontmatter модулей на существующие значения.`);
  console.error(`\n  Для отладки: --skip-unknown — запишет с бэктиками вместо ссылок.`);
}

async function runBuildPageLegend(argv) {
  const opts = parseArgv(argv);
  if (opts.help) { console.log(HELP); return; }

  // Дефолт каталога
  if (!opts.catalog) {
    const def = path.join(GENERATED_DIR, `catalog.${opts.lang}.json`);
    if (await fileExists(def)) opts.catalog = def;
  }
  if (opts.catalog) {
    try { opts._catalog = JSON.parse(await fs.readFile(path.resolve(opts.catalog), 'utf8')); }
    catch (e) { throw new Error(`Не удалось прочитать каталог: ${e.message}`); }
  } else opts._catalog = null;

  const rootDir = opts.rootDir
    ? path.resolve(opts.rootDir)
    : path.join(DOCS_DIR, opts.lang, 'Модули');

  const files = await findIndexFiles(rootDir);
  console.log(`=== build-page-legend ===`);
  console.log(`rootDir:  ${rootDir}`);
  console.log(`catalog:  ${opts._catalog ? path.resolve(opts.catalog) : '(raw snapshot)'}`);
  console.log(`Найдено ${files.length} модулей`);

  // Фаза 1: сбор
  const results = [];
  for (const file of files) {
    const r = await processFile(file, opts);
    results.push({ file, ...r });
  }

  const allUnknowns = [];
  for (const r of results) if (r.unknowns) for (const u of r.unknowns) allUnknowns.push({ ...u, file: r.file });

  if (allUnknowns.length > 0 && !opts.skipUnknown) {
    const registryPath = opts._catalog?.registryPath
      || path.join(REGISTRY_DIR, opts.lang + '.yaml');
    printUnknownError(allUnknowns, registryPath);
    process.exit(1);
  }

  // Фаза 2: запись
  const counts = { created: 0, updated: 0, unchanged: 0, outdated: 0, skip: 0, error: 0 };
  for (const r of results) {
    const rel = path.relative(process.cwd(), r.file);
    if (r.status === 'skip') { counts.skip++; console.log(`  - ${rel} — ${r.reason}`); continue; }
    if (r.status === 'error') { counts.error++; console.error(`  ✗ ${rel} — ${r.reason}`); continue; }

    counts[r.action]++;
    const extra = r.indexMdPath ? ', include+' : '';
    const warn = r.unknowns.length ? `, unknown=${r.unknowns.length}` : '';
    const tag = { created: '＋', updated: '↻', unchanged: '=', outdated: '⚠' }[r.action];
    console.log(`  ${tag} ${rel}  [${r.action}${extra}${warn}]`);

    if (opts.dryRun) continue;
    if (r.action === 'created' || r.action === 'updated') {
      await fs.writeFile(r.legendPath, r.legendContent, 'utf8');
    }
    if (r.indexMdPath) await fs.writeFile(r.indexMdPath, r.indexMdContent, 'utf8');
  }

  console.log(`\nИтог:`);
  console.log(`  создано: ${counts.created}, обновлено: ${counts.updated}`);
  console.log(`  без изменений: ${counts.unchanged}, устаревших: ${counts.outdated}`);
  console.log(`  пропущено: ${counts.skip}, ошибок: ${counts.error}`);
  if (opts.dryRun) console.log('\nDRY-RUN: файлы не записаны');
}

if (require.main === module) {
  runBuildPageLegend(process.argv.slice(2))
    .catch(e => { console.error(e.message || e); process.exit(1); });
}

module.exports = { runBuildPageLegend };