#!/usr/bin/env node
// @ts-nocheck

// plugins/docs-registry/emit-modules-table/index.js

'use strict';

const fs = require('fs/promises');
const path = require('path');
const { GENERATED_DIR, DOCS_DIR } = require('../_paths.js');

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

function toPosix(p) { return p.split(path.sep).join('/'); }

function naturalCompare(a, b) {
  const re = /(\d+)|(\D+)/g;
  const ax = String(a).match(re) || [];
  const bx = String(b).match(re) || [];
  const n = Math.max(ax.length, bx.length);
  for (let i = 0; i < n; i++) {
    const x = ax[i] || ''; const y = bx[i] || '';
    const nx = /^\d+$/.test(x) ? parseInt(x, 10) : null;
    const ny = /^\d+$/.test(y) ? parseInt(y, 10) : null;
    if (nx !== null && ny !== null) { if (nx !== ny) return nx - ny; }
    else { if (x < y) return -1; if (x > y) return 1; }
  }
  return 0;
}

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
function renderId(mod, outDirRel, anchor) {
  if (!mod.id) return '';
  let href = path.posix.relative(outDirRel, mod.path);
  if (anchor) href += '#' + anchor;
  return makeLink(mod.id, href);
}

// Поле массива slug'ов → ссылки на index.md измерений, склейка " / "
function renderDimensions(mod, field, dimName, catalog, outDirRel) {
  const slugs = mod[field] || [];
  if (slugs.length === 0) return '';
  const items = (catalog.dimensions[dimName]?.items) || {};
  const parts = [];
  for (const slug of slugs) {
    const item = items[slug];
    if (!item) { parts.push(codeWrap(slug)); continue; }
    const dimIndexRel = path.posix.join(item.dir, 'index.md');
    const href = path.posix.relative(outDirRel, dimIndexRel);
    parts.push(makeLink(item.title || slug, href));
  }
  return parts.join(' / ');
}

// Хелпер: массив измерений
function dimArray(mod, field, dimName, catalog, outDirRel) {
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
    const dimIndexRel = path.posix.join(item.dir, 'index.md');
    const href = path.posix.relative(outDirRel, dimIndexRel);
    out.push({
      slug,
      title: item.title || slug,
      link: makeLink(item.title || slug, href),
    });
  }
  return out;
}

// Хелпер: сырой href модуля
function moduleHref(mod, outDirRel, anchor) {
  let href = path.posix.relative(outDirRel, mod.path);
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
  const outDirAbs = opts.outDir
    ? path.resolve(opts.outDir)
    : path.join(DOCS_DIR, opts.lang, 'Модули', 'Реестр');

  console.log('=== emit-modules-table ===');
  console.log(`catalog: ${catalogPath}`);
  console.log(`out:     ${outPath}`);
  console.log(`outDir:  ${outDirAbs}`);

  let catalog;
  try { catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')); }
  catch (e) { console.error(`Не удалось прочитать каталог: ${e.message}`); process.exit(1); }

  const docsRoot = path.resolve(catalog.docsRoot);
  const outDirRel = toPosix(path.relative(docsRoot, outDirAbs));
  console.log(`docsRoot: ${docsRoot}`);
  console.log(`outDirRel: ${outDirRel}`);
  console.log('');

  const rows = [];
  for (const mod of Object.values(catalog.modules || {})) {
    rows.push({
      // --- существующие (markdown) для registry-table.md ---
      id:         renderId(mod, outDirRel, opts.anchor),
      ident:      codeWrap(mod.ident || ''),
      folder:     renderFolder(mod),
      layer:      renderDimensions(mod, 'layers',       'layer',      catalog, outDirRel),
      family:     renderDimensions(mod, 'families',     'family',     catalog, outDirRel),
      capability: renderDimensions(mod, 'capabilities', 'capability', catalog, outDirRel),

      id_href:         moduleHref(mod, outDirRel, opts.anchor),        // NEW
      families_arr:    dimArray(mod, 'families',     'family',     catalog, outDirRel), // NEW
      capabilities_arr:dimArray(mod, 'capabilities', 'capability', catalog, outDirRel), // NEW
      layers_arr:      dimArray(mod, 'layers',       'layer',      catalog, outDirRel), // NEW

      // --- NEW: plain-поля для treemap и других non-markdown визуализаций ---
      id_plain:         mod.id || '',
      ident_plain:      mod.ident || '',
      layer_plain:      plainDim(mod, 'layers',       catalog, 'layer'),
      family_plain:     plainDim(mod, 'families',     catalog, 'family'),
      capability_plain: plainDim(mod, 'capabilities', catalog, 'capability'),
      treemapLabel:     treemapLabel(mod),

      _sortKey: mod.id || '',
    });
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