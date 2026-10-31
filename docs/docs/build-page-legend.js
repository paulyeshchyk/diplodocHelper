#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');

// ---------- CLI ----------
const HELP = `
Использование: node build-page-legend.js [dir] [options]

Опции:
  --rewrite              Всегда перезаписывать page-legend.md
                         (без флага существующий файл не трогаем)
  --order=<mode>         Порядок свойств в легенде:
                           custom     — порядок из CUSTOM_ORDER (по умолчанию)
                           ascending  — по возрастанию
                           descending — по убыванию
                           none       — как во frontmatter
  --ignore=<list>        Список свойств (через запятую), которые не попадут
                         в legend. Пример: --ignore=sectionType,context
  --dry-run              Ничего не писать на диск
  --verbose              Подробный вывод
  -h, --help             Показать эту справку

Пример:
  node build-page-legend.js ./ru/Модули/Реестр --rewrite --ignore=sectionType,context,pureTitle,ID_Group,ID_Type
`;

function parseArgv(argv) {
  const opts = {
    rootDir: '.',
    rewrite: false,
    order: 'custom',
    ignore: new Set(),
    dryRun: false,
    verbose: false,
    help: false,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rewrite') opts.rewrite = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--order=')) opts.order = a.slice('--order='.length);
    else if (a === '--order') opts.order = argv[++i];
    else if (a.startsWith('--ignore=')) opts.ignore = splitList(a.slice('--ignore='.length));
    else if (a === '--ignore') opts.ignore = splitList(argv[++i]);
    else if (!a.startsWith('-')) positional.push(a);
    else throw new Error(`Неизвестная опция: ${a}`);
  }

  if (positional[0]) opts.rootDir = positional[0];

  const allowedOrders = new Set(['custom', 'ascending', 'descending', 'none']);
  if (!allowedOrders.has(opts.order)) {
    throw new Error(`--order: допустимо custom|ascending|descending|none, получено "${opts.order}"`);
  }
  return opts;
}

function splitList(s) {
  return new Set(String(s).split(',').map(x => x.trim()).filter(Boolean));
}

// ---------- Правила форматирования ----------
const PROPERTY_FORMAT = {
  ID:            'plain',
  pureTitle:     'plain',
  designation:   'plain',
  Идентификатор: 'backtick',
  layer:         'backtick',
  capability:    'backtick',
  family:        'backtick',
  folder:        'backtick',
  version:       'backtick',
  entrypoint:    'backtick'
};

// ---------- Тип значения ----------
// 'auto'  — обычное значение (по умолчанию)
// 'array' — значение разбирается как массив; каждый элемент форматируется
//           по PROPERTY_FORMAT[key], элементы склеиваются PROPERTY_JOIN[key]
const PROPERTY_TYPE = {
  layer:      'array',
  capability: 'array',
  family:     'array',
  folder:     'array',
};

// Разделитель между элементами массива
const PROPERTY_JOIN = {
  layer:  ' / ',
  folder: ' ; ',
  // capability, family, кастомные → DEFAULT_JOIN
};
const DEFAULT_JOIN = ' + ';

// Порядок свойств для --order=custom
const CUSTOM_ORDER = [
  'ID',
  'ID_Group',
  'ID_Type',
  'Идентификатор',
  'title',
  'sectionType',
  'context',
  'capability',
  'family',
  'layer',
  'designation',
  'folder',
  'entrypoint',
  'role',
  'version',
];

// ---------- Общие утилиты ----------

// Снимает внешнюю обёртку: `...`, '...', "...", если она есть.
// Нужен, чтобы не навешивать вторую пару бэктиков на уже обёрнутое значение.
function stripExistingWrap(str) {
  const s = String(str).trim();
  if (s.length < 2) return s;
  const first = s[0];
  const last = s[s.length - 1];
  if ((first === '`' || first === "'" || first === '"') && first === last) {
    return s.slice(1, -1);
  }
  return s;
}

async function findIndexFiles(dir, results = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await findIndexFiles(full, results);
    else if (e.isFile() && e.name === 'index.md') results.push(full);
  }
  return results;
}

function splitFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { frontmatter: m[1], body: m[2] };
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// ---------- Форматирование значения ----------
// Форматирование одного скалярного значения (элемента массива)
function formatScalar(key, value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  if (str.trim() === '') return '';

  const style = PROPERTY_FORMAT[key] || 'auto';
  switch (style) {
    case 'plain':
      return str;

    case 'backtick': {
      const inner = stripExistingWrap(str);
      return '`' + inner.replace(/`/g, '\\`') + '`';
    }

    case 'single': {
      const inner = stripExistingWrap(str);
      return "'" + inner.replace(/'/g, "''") + "'";
    }

    case 'double': {
      const inner = stripExistingWrap(str);
      return '"' + inner.replace(/"/g, '\\"') + '"';
    }

    case 'auto':
    default: {
      // В auto сохраняем прежнее поведение: «уже обёрнутое» оставляем как есть
      if (/^'[\s\S]*'$/.test(str) || /^"[\s\S]*"$/.test(str) || /^`[\s\S]*`$/.test(str)) return str;
      if (typeof value === 'number' || typeof value === 'boolean') return str;
      if (/^-?\d+(\.\d+)?$/.test(str)) return str;
      if (!/\s/.test(str) && /^[\w./@{}\-:()]+$/i.test(str)) return '`' + str + '`';
      return str;
    }
  }
}

// Разбор значения как массива элементов
function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(v => (v === null || v === undefined ? '' : String(v)))
      .filter(v => v.trim() !== '');
  }
  if (value === null || value === undefined) return [];
  const str = String(value);
  if (str.trim() === '') return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

// Точка входа — учитывает PROPERTY_TYPE
function formatLegendValue(key, value) {
  const type = PROPERTY_TYPE[key] || 'auto';

  if (type === 'array') {
    const parts = parseArrayValue(value);
    if (parts.length === 0) return '';
    if (parts.length === 1) return formatScalar(key, parts[0]);
    const sep = PROPERTY_JOIN[key] || DEFAULT_JOIN;
    return parts.map(p => formatScalar(key, p)).join(sep);
  }

  return formatScalar(key, value);
}

// ---------- Сортировка ----------
function sortEntries(entries, order) {
  if (order === 'none') return entries;

  if (order === 'ascending') {
    return [...entries].sort(([a], [b]) => String(a).localeCompare(String(b), 'ru'));
  }
  if (order === 'descending') {
    return [...entries].sort(([a], [b]) => String(b).localeCompare(String(a), 'ru'));
  }
  // custom: сначала известные ключи в порядке CUSTOM_ORDER, потом остальные в исходном порядке
  const idx = new Map(CUSTOM_ORDER.map((k, i) => [k, i]));
  const known = [];
  const unknown = [];
  for (const e of entries) (idx.has(e[0]) ? known : unknown).push(e);
  known.sort((a, b) => idx.get(a[0]) - idx.get(b[0]));
  return [...known, ...unknown];
}

// ---------- Генерация легенды ----------
function renderLegend(frontmatter, opts) {
  let entries = Object.entries(frontmatter);
  if (opts.ignore.size) entries = entries.filter(([k]) => !opts.ignore.has(k));
  entries = sortEntries(entries, opts.order);
  if (entries.length === 0) return null;

  const rows = entries.map(([k, v]) => [k, formatLegendValue(k, v)]);
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

// ---------- Include-строка в index.md ----------
const INCLUDE_LINE = '{% include [legend](./page-legend.md) %}';

function ensureInclude(content) {
  if (content.includes(INCLUDE_LINE)) return { content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trimmed = content.replace(/\s+$/, '');
  return { content: trimmed + eol + eol + INCLUDE_LINE + eol, changed: true };
}

// ---------- Обработка одного файла ----------
async function processFile(filePath, opts) {
  const raw = await fs.readFile(filePath, 'utf8');
  const hasBom = raw.charCodeAt(0) === 0xFEFF;
  const content = hasBom ? raw.slice(1) : raw;

  const parts = splitFrontmatter(content);
  if (!parts) return { status: 'skip', reason: 'нет frontmatter' };

  let fm;
  try {
    fm = yaml.load(parts.frontmatter) || {};
  } catch (e) {
    return { status: 'error', reason: `невалидный YAML: ${e.message}` };
  }
  if (typeof fm !== 'object' || Array.isArray(fm)) {
    return { status: 'error', reason: 'frontmatter не объект' };
  }

  const legendContent = renderLegend(fm, opts);
  if (legendContent === null) {
    return { status: 'skip', reason: 'frontmatter пуст (или всё отфильтровано ignore)' };
  }

  const legendPath = path.join(path.dirname(filePath), 'page-legend.md');
  const legendExists = await fileExists(legendPath);

  let legendAction = 'skipped-exists';
  if (opts.rewrite || !legendExists) {
    legendAction = legendExists ? 'updated' : 'created';
    if (!opts.dryRun) await fs.writeFile(legendPath, legendContent, 'utf8');
  }

  const { content: newContent, changed } = ensureInclude(content);
  const includeAction = changed ? 'added' : 'present';
  if (changed && !opts.dryRun) {
    await fs.writeFile(filePath, (hasBom ? '\uFEFF' : '') + newContent, 'utf8');
  }

  return { status: 'ok', legendAction, includeAction };
}

// ---------- main ----------
async function main() {
  let opts;
  try { opts = parseArgv(process.argv.slice(2)); }
  catch (e) { console.error(e.message); console.error(HELP); process.exit(2); }

  if (opts.help) { console.log(HELP); return; }

  const files = await findIndexFiles(opts.rootDir);
  console.log(`Найдено ${files.length} index.md в ${path.resolve(opts.rootDir)}`);
  console.log(`  order=${opts.order}  rewrite=${opts.rewrite}  ignore=[${[...opts.ignore].join(', ')}]`);
  if (opts.dryRun) console.log('DRY-RUN: файлы не будут записаны');
  console.log('');

  const counts = { ok: 0, skip: 0, error: 0 };

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const r = await processFile(file, opts);
    counts[r.status] = (counts[r.status] || 0) + 1;

    if (r.status === 'ok') {
      const markL = { created: 'legend:создан', updated: 'legend:обновлён', 'skipped-exists': 'legend:уже есть (skip)' }[r.legendAction];
      const markI = { added: 'include:добавлен', present: 'include:уже есть' }[r.includeAction];
      console.log(`✅ ${rel} — ${markL}, ${markI}`);
    } else if (r.status === 'skip') {
      console.log(`⚠️  ${rel} — ${r.reason}`);
    } else {
      console.error(`❌ ${rel} — ${r.reason}`);
    }
  }

  console.log('\nИтог:');
  console.log(`  обработано: ${counts.ok}`);
  console.log(`  пропущено:  ${counts.skip}`);
  console.log(`  ошибок:     ${counts.error}`);
}

main().catch(e => { console.error(e); process.exit(1); });