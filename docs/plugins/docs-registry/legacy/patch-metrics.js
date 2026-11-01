#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');

const SCRIPT_DIR = __dirname;

const HELP = `
Использование: node patch-metrics.js [options]

Для каждого модуля пишет metrics.md со ссылками на его измерения.

Опции:
  --lang=<ru|en>        язык (по умолчанию ru)
  --catalog=<path>      путь к catalog.json
                        по умолчанию <скрипт>/_generated/catalog.<lang>.json
  --out-name=<name>     имя выходного файла (по умолчанию metrics.md)
  --rewrite             перезаписывать существующие metrics.md
  --with-include        добавить {% include [metrics](./metrics.md) %} в index.md модуля
  --dry-run             показать план, ничего не писать
  --verbose             подробный вывод
  -h, --help            эта справка
`;

function parseArgv(argv) {
  const opts = {
    lang: 'ru',
    catalog: null,
    outName: 'metrics.md',
    rewrite: false,
    withInclude: false,
    dryRun: false,
    verbose: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rewrite') opts.rewrite = true;
    else if (a === '--with-include') opts.withInclude = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--lang=')) opts.lang = a.slice('--lang='.length);
    else if (a === '--lang') opts.lang = argv[++i];
    else if (a.startsWith('--catalog=')) opts.catalog = a.slice('--catalog='.length);
    else if (a === '--catalog') opts.catalog = argv[++i];
    else if (a.startsWith('--out-name=')) opts.outName = a.slice('--out-name='.length);
    else if (a === '--out-name') opts.outName = argv[++i];
    else throw new Error(`Неизвестная опция: ${a}`);
  }
  return opts;
}

function escapeCellText(s) {
  return String(s).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}
function escapeLinkText(s) {
  return String(s).replace(/\r?\n/g, ' ').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

// Собираем строки для одного измерения модуля
function buildRowsForDim(catalog, dimName, slugs, modDir) {
  if (!slugs || slugs.length === 0) return [];
  const dim = catalog.dimensions[dimName];
  if (!dim) return [];

  const rows = [];
  for (const slug of slugs) {
    const item = (dim.items || {})[slug];
    if (!item) continue;
    const dimIndexRel = path.posix.join(item.dir, 'index.md');
    const relPath = path.posix.relative(modDir, dimIndexRel);
    const href = encodeURI(relPath);
    rows.push([dim.title || dimName, `[${escapeLinkText(item.title || slug)}](${href})`]);
  }
  return rows;
}

const DIM_ORDER = ['family', 'layer', 'capability'];
const DIM_FIELD = { family: 'families', layer: 'layers', capability: 'capabilities' };
const JOIN_SEP = ' / ';

function renderMetrics(catalog, mod) {
  const rows = [];

  for (const dimName of DIM_ORDER) {
    const dim = catalog.dimensions[dimName];
    if (!dim) continue;

    const slugs = mod[DIM_FIELD[dimName]] || [];
    if (slugs.length === 0) continue;

    const links = [];
    for (const slug of slugs) {
      const item = (dim.items || {})[slug];
      if (!item) continue;
      const dimIndexRel = path.posix.join(item.dir, 'index.md');
      const relPath = path.posix.relative(mod.dir, dimIndexRel);
      const href = encodeURI(relPath);
      links.push(`[${escapeLinkText(item.title || slug)}](${href})`);
    }
    if (links.length === 0) continue;

    rows.push([dim.title || dimName, links.join(JOIN_SEP)]);
  }

  if (rows.length === 0) return null;

  const headers = ['Измерение', 'Значение'];
  const widths = [
    Math.max(headers[0].length, ...rows.map(r => r[0].length), 3),
    Math.max(headers[1].length, ...rows.map(r => r[1].length), 3),
  ];
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));

  const lines = [];
  lines.push(`| ${pad(headers[0], widths[0])} | ${pad(headers[1], widths[1])} |`);
  lines.push(`| ${'-'.repeat(widths[0])} | ${'-'.repeat(widths[1])} |`);
  for (const r of rows) {
    lines.push(`| ${pad(r[0], widths[0])} | ${pad(r[1], widths[1])} |`);
  }
  lines.push('');
  lines.push('{: .page-metrics }');
  lines.push('');
  return lines.join('\n');
}

function ensureInclude(content, outName) {
  const line = `{% include [metrics](./${outName}) %}`;
  if (content.includes(line)) return { content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trimmed = content.replace(/\s+$/, '');
  return { content: trimmed + eol + eol + line + eol, changed: true };
}

async function main() {
  let opts;
  try { opts = parseArgv(process.argv.slice(2)); }
  catch (e) { console.error(e.message); console.error(HELP); process.exit(2); }
  if (opts.help) { console.log(HELP); return; }

  const catalogPath = opts.catalog
    ? path.resolve(opts.catalog)
    : path.join(SCRIPT_DIR, '_generated', `catalog.${opts.lang}.json`);

  console.log('=== patch-metrics ===');
  console.log(`catalog: ${catalogPath}`);
  if (opts.dryRun) console.log('DRY-RUN: файлы не будут записаны');
  console.log('');

  let catalog;
  try { catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')); }
  catch (e) { console.error(`Не удалось прочитать каталог: ${e.message}`); process.exit(1); }

  const docsRoot = catalog.docsRoot;
  console.log(`docsRoot: ${docsRoot}`);
  console.log('');

  const counts = { created: 0, updated: 0, unchanged: 0, outdated: 0, skipped: 0, errors: 0 };

  for (const [modDir, mod] of Object.entries(catalog.modules || {})) {
    const modDirAbs = path.join(docsRoot, modDir);
    const targetFileAbs = path.join(modDirAbs, opts.outName);

    const content = renderMetrics(catalog, mod);
    if (content == null) {
      counts.skipped++;
      if (opts.verbose) console.log(`  - ${modDir}: нет измерений, пропуск`);
      continue;
    }

    let existing = null;
    try { existing = await fs.readFile(targetFileAbs, 'utf8'); } catch {}

    const label = `${modDir}/${opts.outName}`;

    if (existing != null && !opts.rewrite) {
      if (existing === content) {
        counts.unchanged++;
        if (opts.verbose) console.log(`  = ${label}`);
      } else {
        counts.outdated++;
        console.log(`  ⚠ ${label} — содержимое устарело (--rewrite для обновления)`);
      }
      continue;
    }

    if (opts.dryRun) {
      const mark = existing != null ? '↻' : '+';
      console.log(`  ${mark} ${label}`);
      if (existing != null) counts.updated++; else counts.created++;
      continue;
    }

    try {
      await fs.writeFile(targetFileAbs, content, 'utf8');
      if (existing != null) { counts.updated++; console.log(`  ↻ ${label}`); }
      else                   { counts.created++; console.log(`  + ${label}`); }
    } catch (e) {
      console.error(`  ✗ ${label}: ${e.message}`);
      counts.errors++;
      continue;
    }

    if (opts.withInclude) {
      const indexMdPath = path.join(modDirAbs, 'index.md');
      let indexMd;
      try { indexMd = await fs.readFile(indexMdPath, 'utf8'); }
      catch { indexMd = null; }
      if (indexMd != null) {
        const { content: newIndex, changed } = ensureInclude(indexMd, opts.outName);
        if (changed && !opts.dryRun) {
          await fs.writeFile(indexMdPath, newIndex, 'utf8');
          if (opts.verbose) console.log(`      + include → ${modDir}/index.md`);
        }
      }
    }
  }

  console.log('');
  console.log('Итог:');
  console.log(`  создано:       ${counts.created}`);
  console.log(`  обновлено:     ${counts.updated}`);
  console.log(`  без изменений: ${counts.unchanged}`);
  console.log(`  устаревших:    ${counts.outdated}`);
  console.log(`  пропущено:     ${counts.skipped}`);
  console.log(`  ошибок:        ${counts.errors}`);
  if (opts.dryRun) console.log('\nDRY-RUN: файлы не записаны');
  if (counts.outdated > 0 && !opts.rewrite) {
    console.log('\nПодсказка: запустите с --rewrite, чтобы обновить устаревшие metrics.md');
  }
}

main().catch(e => { console.error(e); process.exit(1); });