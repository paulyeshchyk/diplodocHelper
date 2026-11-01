#!/usr/bin/env node
'use strict';

require('../_paths.js')

const fs = require('fs/promises');
const path = require('path');
const { GENERATED_DIR } = require('../_paths.js');

// ---------- CLI ----------
const HELP = `
Использование: node render-modules.js [options]

Опции:
  --lang=<ru|en>            язык (по умолчанию ru)
  --catalog=<path>          путь к catalog.json
                            по умолчанию <docs>/_generated/catalog.<lang>.json
  --out-name=<name>         имя выходного файла (по умолчанию modules.md)
  --anchor=<name>           якорь ссылок (#name). По умолчанию не добавляется
  --rewrite                 перезаписывать существующие modules.md
  --with-include            добавить {% include [modules](./modules.md) %}
                            в index.md измерения (идемпотентно)
  --dry-run                 показать план, ничего не писать
  --verbose                 подробный вывод
  -h, --help                эта справка
`;

function parseArgv(argv) {
  const opts = {
    lang: 'ru',
    catalog: null,
    outName: 'modules.md',
    anchor: '',
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
    else if (a.startsWith('--anchor=')) opts.anchor = a.slice('--anchor='.length);
    else if (a === '--anchor') opts.anchor = argv[++i];
    else throw new Error(`Неизвестная опция: ${a}`);
  }
  return opts;
}

// ---------- Форматирование ячеек ----------
function inferType(field) {
  if (field === 'id') return 'link';
  if (field === 'ident') return 'code';
  return 'text';
}

function resolveColumnValue(mod, column) {
  if (!mod) return '';
  const v1 = mod[column.field];
  if (v1 != null && String(v1).trim() !== '') return String(v1);
  if (column.fallback) {
    const v2 = mod[column.fallback];
    if (v2 != null && String(v2).trim() !== '') return String(v2);
  }
  return '';
}

function escapeCellText(s) {
  return String(s).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function escapeLinkText(s) {
  return String(s)
    .replace(/\r?\n/g, ' ')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function renderCell(mod, column, targetDirRel, opts) {
  const type = column.type || inferType(column.field);
  const value = resolveColumnValue(mod, column);
  if (value === '') return '';

  if (type === 'link') {
    // Путь от папки измерения до index.md модуля
    const relPath = path.posix.relative(targetDirRel, mod.path);
    let href = encodeURI(relPath);
    if (opts.anchor) href += '#' + opts.anchor;
    return `[${escapeLinkText(value)}](${href})`;
  }
  if (type === 'code') {
    return '`' + value.replace(/`/g, '\\`') + '`';
  }
  return escapeCellText(value);
}

// ---------- Таблица ----------
function renderTable(columns, moduleDirs, catalog, targetDirRel, opts) {
  const headers = columns.map(c => c.label || c.field);
  const rows = [];
  for (const modDir of moduleDirs) {
    const mod = catalog.modules[modDir];
    if (!mod) continue;
    rows.push(columns.map(col => renderCell(mod, col, targetDirRel, opts)));
  }

  // Ширины колонок
  const widths = headers.map((h, i) => {
    let w = h.length;
    for (const r of rows) {
      const len = (r[i] || '').length;
      if (len > w) w = len;
    }
    return Math.max(w, 3);
  });

  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
  const lines = [];
  lines.push('| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |');
  lines.push('| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |');
  for (const r of rows) {
    lines.push('| ' + r.map((c, i) => pad(c || '', widths[i])).join(' | ') + ' |');
  }
  return lines.join('\n') + '\n';
}

// ---------- Include в index.md измерения ----------
function ensureInclude(content, outName) {
  const line = `{% include [modules](./${outName}) %}`;
  if (content.includes(line)) return { content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trimmed = content.replace(/\s+$/, '');
  return { content: trimmed + eol + eol + line + eol, changed: true };
}

// ---------- main (обёрнут в runRenderModules) ----------
async function runRenderModules(argv) {
  let opts;
  try { opts = parseArgv(argv); }
  catch (e) { console.error(e.message); console.error(HELP); process.exit(2); }
  if (opts.help) { console.log(HELP); return; }

  const catalogPath = opts.catalog
    ? path.resolve(opts.catalog)
    : path.join(GENERATED_DIR, `catalog.${opts.lang}.json`);

  console.log('=== render-modules ===');
  console.log(`catalog: ${catalogPath}`);
  if (opts.dryRun) console.log('DRY-RUN: файлы не будут записаны');
  console.log('');

  let catalog;
  try { catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')); }
  catch (e) { console.error(`Не удалось прочитать каталог: ${e.message}`); process.exit(1); }

  const docsRoot = catalog.docsRoot;
  console.log(`docsRoot: ${docsRoot}`);
  console.log('');

  const counts = {
    created: 0, updated: 0, unchanged: 0, outdated: 0,
    errors: 0, totalModules: 0,
  };

  for (const [dimName, dim] of Object.entries(catalog.dimensions || {})) {
    const columns = dim.columns || [];
    if (columns.length === 0) {
      console.error(`✗ ${dimName}: в реестре нет columns`);
      counts.errors++;
      continue;
    }
    const items = dim.items || {};
    for (const [slug, item] of Object.entries(items)) {
      const targetDirAbs = path.join(docsRoot, item.dir);
      const targetFileAbs = path.join(targetDirAbs, opts.outName);
      const moduleDirs = (catalog.index[dimName] || {})[slug] || [];

      // Проверим, что папка измерения существует
      try { await fs.access(targetDirAbs); }
      catch {
        console.error(`✗ ${dimName}/${slug}: папка не существует: ${item.dir}`);
        counts.errors++;
        continue;
      }

      const content = renderTable(columns, moduleDirs, catalog, item.dir, opts);
      counts.totalModules += moduleDirs.length;

      // Существующий файл?
      let existing = null;
      try { existing = await fs.readFile(targetFileAbs, 'utf8'); } catch {}

      const label = `${dimName}/${slug} → ${item.dir}/${opts.outName} [${moduleDirs.length}]`;

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
        if (existing != null) counts.updated++;
        else counts.created++;
        continue;
      }

      try {
        await fs.writeFile(targetFileAbs, content, 'utf8');
        if (existing != null) {
          counts.updated++;
          console.log(`  ↻ ${label}`);
        } else {
          counts.created++;
          console.log(`  + ${label}`);
        }
      } catch (e) {
        console.error(`  ✗ ${label}: ${e.message}`);
        counts.errors++;
        continue;
      }

      // Include в index.md измерения
      if (opts.withInclude) {
        const indexMdPath = path.join(targetDirAbs, 'index.md');
        let indexMd;
        try { indexMd = await fs.readFile(indexMdPath, 'utf8'); }
        catch { indexMd = null; }
        if (indexMd != null) {
          const { content: newIndex, changed } = ensureInclude(indexMd, opts.outName);
          if (changed && !opts.dryRun) {
            await fs.writeFile(indexMdPath, newIndex, 'utf8');
            if (opts.verbose) console.log(`      + include → ${item.dir}/index.md`);
          }
        }
      }
    }
  }

  console.log('');
  console.log('Итог:');
  console.log(`  создано:           ${counts.created}`);
  console.log(`  обновлено:         ${counts.updated}`);
  console.log(`  без изменений:     ${counts.unchanged}`);
  console.log(`  устаревших:        ${counts.outdated}`);
  console.log(`  ошибок:            ${counts.errors}`);
  console.log(`  строк в таблицах:  ${counts.totalModules}`);
  if (opts.dryRun) console.log('\nDRY-RUN: файлы не записаны');
  if (counts.outdated > 0 && !opts.rewrite) {
    console.log('\nПодсказка: запустите с --rewrite, чтобы обновить устаревшие modules.md');
  }
}

// ---------- Entry point ----------
if (require.main === module) {
  runRenderModules(process.argv.slice(2))
    .catch(e => { console.error(e.message || e); process.exit(1); });
}

module.exports = { runRenderModules };