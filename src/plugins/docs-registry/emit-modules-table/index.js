#!/usr/bin/env node
// @ts-nocheck

// plugins/docs-registry/emit-modules-table/index.js

'use strict';

const fs = require('fs/promises');
const path = require('path');
const { GENERATED_DIR, DOCS_DIR } = require('../_paths.js');
const { loadFields } = require('../_fields.js');
const { String_Compare_Natural } = require('../../utils/string/String_Compare_Natural.ts');

const HELP = `
Использование: node emit-modules-table.js [options]

Строит modules-table.<lang>.json из catalog.<lang>.json — плоский массив
записей в формате, совместимом с json-to-md (--schema modules).

Опции:
  --lang=<ru|en>     язык (по умолчанию ru)
  --catalog=<path>   catalog.json (по умолчанию <docs>/_generated/catalog.<lang>.json)
  --out=<path>       куда писать JSON (по умолчанию <docs>/_generated/modules-table.<lang>.json)
  --out-dir=<path>   папка, где будет лежать итоговый .md
                     (базис для относительных ссылок).
                     По умолчанию <docs>/<lang>/Модули/Реестр
  --anchor=<name>    якорь для ссылок на модули (например naznachenie)
  --sort=<field>     id | ident | folder (по умолчанию id, natural sort)
  --verbose          подробный вывод
  -h, --help         справка
`;

function parseArgv(argv) {
  const opts = {
    lang: 'ru', catalog: null, out: null, outDir: null,
    anchor: '', sort: 'id', verbose: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verbose') opts.verbose = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--lang=')) opts.lang = a.slice('--lang='.length);
    else if (a === '--lang') opts.lang = argv[++i];
    else if (a.startsWith('--catalog=')) opts.catalog = a.slice('--catalog='.length);
    else if (a === '--catalog') opts.catalog = argv[++i];
    else if (a.startsWith('--out=')) opts.out = a.slice('--out='.length);
    else if (a === '--out') opts.out = argv[++i];
    else if (a.startsWith('--out-dir=')) opts.outDir = a.slice('--out-dir='.length);
    else if (a === '--out-dir') opts.outDir = argv[++i];
    else if (a.startsWith('--anchor=')) opts.anchor = a.slice('--anchor='.length);
    else if (a === '--anchor') opts.anchor = argv[++i];
    else if (a.startsWith('--sort=')) opts.sort = a.slice('--sort='.length);
    else if (a === '--sort') opts.sort = argv[++i];
    else throw new Error(`Неизвестная опция: ${a}`);
  }
  return opts;
}

function getUrlPrefix(docsRoot) {
  const rel = path.relative(DOCS_DIR, docsRoot);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;  // docsRoot вне DOCS_DIR — откатываемся на старый режим
  }
  return '/' + toPosix(rel).replace(/^\/+|\/+$/g, '');
}

function toPosix(p) { return p.split(path.sep).join('/'); }

const naturalCompare = String_Compare_Natural.compare;

function escapeLinkText(s) {
  return String(s).replace(/\r?\n/g, ' ').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function makeLink(text, href) {
  return `[${escapeLinkText(text)}](${encodeURI(href)})`;
}

function codeWrap(value) {
  const str = String(value).trim();
  if (!str) return '';
  return '`' + str.replace(/`/g, '\\`') + '`';
}

// ID модуля → ссылка на его index.md (опционально с якорем)
function renderId(mod, urlPrefix, anchor) {
  if (!mod.id) return '';
  let href = `${urlPrefix}/${mod.path}`.replace(/\.md$/, '.html');
  if (anchor) href += '#' + anchor;
  return makeLink(mod.id, href);
}

// Поле массива slug'ов → ссылки на index.md измерений, склейка " / "
function renderDimensions(mod, field, dimName, catalog, urlPrefix) {
  const slugs = mod[field] || [];
  if (slugs.length === 0) return '';
  const items = (catalog.dimensions[dimName]?.items) || {};
  const parts = [];
  for (const slug of slugs) {
    const item = items[slug];
    if (!item) { parts.push(codeWrap(slug)); continue; }
    const href = `${urlPrefix}/${item.dir}/index.md`.replace(/\.md$/, '.html');
    parts.push(makeLink(item.title || slug, href));
  }
  return parts.join(' / ');
}

// Хелпер: массив измерений
function dimArray(mod, field, dimName, catalog, urlPrefix) {
  const slugs = mod[field] || [];
  if (slugs.length === 0) return [];
  const items = (catalog.dimensions[dimName]?.items) || {};
  const out = [];
  for (const slug of slugs) {
    const item = items[slug];
    if (!item) {
      out.push({ slug, title: slug, link: codeWrap(slug) });
      continue;
    }
    const href = `${urlPrefix}/${item.dir}/index.md`.replace(/\.md$/, '.html');
    out.push({
      slug,
      title: item.title || slug,
      link: makeLink(item.title || slug, href),
    });
  }
  return out;
}

// Хелпер: сырой href модуля
function moduleHref(mod, urlPrefix, anchor) {
  let href = `${urlPrefix}/${mod.path}`.replace(/\.md$/, '.html');
  if (anchor) href += '#' + anchor;
  return encodeURI(href);
}

// Хелпер: plain-значение измерения (title через " / ", без ссылок)
function plainDim(mod, field, catalog, dimName) {
  const slugs = mod[field] || [];
  if (slugs.length === 0) return '';
  const items = (catalog.dimensions[dimName]?.items) || {};
  return slugs.map(slug => (items[slug]?.title) || slug).join(' / ');
}

// Хелпер: treemap-label "ID идентификатор" (без markdown)
function treemapLabel(mod) {
  const parts = [];
  if (mod.id) parts.push(String(mod.id).trim());
  if (mod.ident) parts.push(String(mod.ident).trim());
  return parts.join(' ');
}

function formatScalar(style, value) {
  const str = String(value).trim();
  if (!str) return '';
  switch (style) {
    case 'backtick': return '`' + str.replace(/`/g, '\\`') + '`';
    case 'double':   return '"' + str.replace(/"/g, '\\"') + '"';
    case 'plain':
    default:         return str;
  }
}

// Папка: строка с запятыми → массив → `a` / `b`
function renderFolder(mod) {
  const raw = mod.folder != null ? String(mod.folder) : '';
  if (!raw.trim()) return '';
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return codeWrap(parts[0]);
  return parts.map(codeWrap).join(' / ');
}

async function runEmitModulesTable(argv) {
  let opts;
  try { opts = parseArgv(argv); }
  catch (e) { console.error(e.message); console.error(HELP); process.exit(2); }
  if (opts.help) { console.log(HELP); return; }

  const catalogPath = opts.catalog
    ? path.resolve(opts.catalog)
    : path.join(GENERATED_DIR, `catalog.${opts.lang}.json`);
  const outPath = opts.out
    ? path.resolve(opts.out)
    : path.join(GENERATED_DIR, `modules-table.${opts.lang}.json`);

  console.log('=== emit-modules-table ===');
  console.log(`catalog: ${catalogPath}`);

  let catalog;
  try { catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')); }
  catch (e) { console.error(`Не удалось прочитать каталог: ${e.message}`); process.exit(1); }

  const docsRoot = path.resolve(catalog.docsRoot);
  const urlPrefix = getUrlPrefix(docsRoot);

  // fallback, если docsRoot вне DOCS_DIR — используем старую логику
  const outDirAbs = opts.outDir
    ? path.resolve(opts.outDir)
    : path.join(DOCS_DIR, opts.lang, 'Модули', 'Реестр');
  const outDirRel = toPosix(path.relative(docsRoot, outDirAbs));

  const effectivePrefix = urlPrefix || null;

  console.log(`docsRoot: ${docsRoot}`);
  console.log(`urlPrefix: ${effectivePrefix || '(relative, outDirRel=' + outDirRel + ')'}`);
  console.log(`out:     ${outPath}`);
  console.log(`outDir:  ${outDirAbs}`);

  const rows = [];
for (const mod of Object.values(catalog.modules || {})) {
  const row = {};

  for (const [key, f] of Object.entries(loadFields())) {
    if (f.kind === 'multi' && f.dimension) {
      // два вида: строка (для simple) и массив (для matrix)
      row[key] = effectivePrefix
        ? renderDimensions(mod, f.dimField, f.dimension, catalog, effectivePrefix)
        : renderDimensions(mod, f.dimField, f.dimension, catalog, outDirRel);
      row[`${f.dimField}_arr`] = effectivePrefix
        ? dimArray(mod, f.dimField, f.dimension, catalog, effectivePrefix)
        : dimArray(mod, f.dimField, f.dimension, catalog, outDirRel);
    } else if (key === 'id') {
      row.id = effectivePrefix
        ? renderId(mod, effectivePrefix, opts.anchor)
        : renderId(mod, outDirRel, opts.anchor);
    } else if (key === 'ident') {
      row.ident = codeWrap(mod.ident || '');
    } else if (key === 'folder') {
      row.folder = renderFolder(mod);
    } else if (f.format === 'plain' || f.format === 'backtick' || f.format === 'double') {
      row[key] = formatScalar(f.format, mod[key] != null ? mod[key] : '');
    }
  }

  row.id_href = effectivePrefix
    ? moduleHref(mod, effectivePrefix, opts.anchor)
    : moduleHref(mod, outDirRel, opts.anchor);

  // дополнительные plain-поля, специфичные для json-to-md
  row.id_plain         = mod.id || '';
  row.ident_plain      = mod.ident || '';
  row.layer_plain      = plainDim(mod, 'layers',       catalog, 'layer');
  row.family_plain     = plainDim(mod, 'families',     catalog, 'family');
  row.capability_plain = plainDim(mod, 'capabilities', catalog, 'capability');
  row.treemapLabel     = treemapLabel(mod);
  row._sortKey         = mod.id || '';

  rows.push(row);
}

  // Sort: natural по id, пустые — в конец
  rows.sort((a, b) => {
    if (!a._sortKey && !b._sortKey) return 0;
    if (!a._sortKey) return 1;
    if (!b._sortKey) return -1;
    return naturalCompare(a._sortKey, b._sortKey);
  });
  for (const r of rows) delete r._sortKey;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');

  console.log(`Записано записей: ${rows.length}`);
  console.log(`✅ ${outPath}`);
}

if (require.main === module) {
  runEmitModulesTable(process.argv.slice(2))
    .catch(e => { console.error(e.message || e); process.exit(1); });
}

module.exports = { runEmitModulesTable };