import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { GENERATED_DIR } from '../_paths.ts';
import type {
  CatalogDimension,
  CatalogModule,
  CatalogSnapshot,
} from '../emit-feature-map/feature-map.types.ts';

const HELP = `
Использование: node render-modules [options]

Опции:
  --lang=<ru|en>            язык (по умолчанию ru)
  --catalog=<path>          путь к catalog.json
                            по умолчанию <generatedDir>/catalog.<lang>.json
  --out-name=<name>         имя выходного файла (по умолчанию modules.md)
  --anchor=<name>           якорь ссылок (#name). По умолчанию не добавляется
  --rewrite                 перезаписывать существующие modules.md
  --with-include            добавить {% include [modules](./modules.md) %}
                            в index.md измерения (идемпотентно)
  --dry-run                 показать план, ничего не писать
  --verbose                 подробный вывод
  -h, --help                эта справка
`;

export interface RunRenderModulesOptions {
  generatedDir?: string;
}

interface ParsedArgv {
  lang: string;
  catalog: string | null;
  outName: string;
  anchor: string;
  rewrite: boolean;
  withInclude: boolean;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

interface ColumnDef {
  label?: string;
  field: string;
  type?: 'link' | 'code' | 'text';
  fallback?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runRenderModules(
  argv: string[],
  options: RunRenderModulesOptions = {},
): Promise<void> {
  let opts: ParsedArgv;
  try {
    opts = parseArgv(argv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    console.error(HELP);
    throw new Error(msg);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }

  const generatedDir = options.generatedDir ?? GENERATED_DIR;

  const catalogPath = opts.catalog
    ? path.resolve(opts.catalog)
    : path.join(generatedDir, `catalog.${opts.lang}.json`);

  console.log('=== render-modules ===');
  console.log(`catalog: ${catalogPath}`);
  if (opts.dryRun) console.log('DRY-RUN: файлы не будут записаны');
  console.log('');

  let catalog: CatalogSnapshot;
  try {
    catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CatalogSnapshot;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Не удалось прочитать каталог: ${msg}`);
  }

  const docsRoot = catalog.docsRoot;
  console.log(`docsRoot: ${docsRoot}`);
  console.log('');

  const counts = {
    created: 0,
    updated: 0,
    unchanged: 0,
    outdated: 0,
    errors: 0,
    totalModules: 0,
  };

  for (const [dimName, dim] of Object.entries(catalog.dimensions || {})) {
    const columns = (dim as CatalogDimension & { columns?: ColumnDef[] }).columns || [];
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

      if (!fsSync.existsSync(targetDirAbs)) {
        console.error(`✗ ${dimName}/${slug}: папка не существует: ${item.dir}`);
        counts.errors++;
        continue;
      }

      const content = renderTable(columns, moduleDirs, catalog, item.dir, opts);
      counts.totalModules += moduleDirs.length;

      let existing: string | null = null;
      try {
        existing = await fs.readFile(targetFileAbs, 'utf8');
      } catch {
        existing = null;
      }

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
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ✗ ${label}: ${msg}`);
        counts.errors++;
        continue;
      }

      if (opts.withInclude) {
        const indexMdPath = path.join(targetDirAbs, 'index.md');
        let indexMd: string | null = null;
        try {
          indexMd = await fs.readFile(indexMdPath, 'utf8');
        } catch {
          indexMd = null;
        }
        if (indexMd != null) {
          const { content: newIndex, changed } = ensureInclude(indexMd, opts.outName);
          if (changed && !opts.dryRun) {
            await fs.writeFile(indexMdPath, newIndex, 'utf8');
            if (opts.verbose) {
              console.log(`      + include → ${item.dir}/index.md`);
            }
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

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgv(argv: string[]): ParsedArgv {
  const opts: ParsedArgv = {
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

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

function inferType(field: string): 'link' | 'code' | 'text' {
  if (field === 'id') return 'link';
  if (field === 'ident') return 'code';
  return 'text';
}

function resolveColumnValue(mod: CatalogModule, column: ColumnDef): string {
  if (!mod) return '';
  const v1 = mod[column.field];
  if (v1 != null && String(v1).trim() !== '') return String(v1);
  if (column.fallback) {
    const v2 = mod[column.fallback];
    if (v2 != null && String(v2).trim() !== '') return String(v2);
  }
  return '';
}

function escapeCellText(s: string): string {
  return String(s).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function escapeLinkText(s: string): string {
  return String(s)
    .replace(/\r?\n/g, ' ')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function renderCell(
  mod: CatalogModule,
  column: ColumnDef,
  targetDirRel: string,
  opts: ParsedArgv,
): string {
  const type = column.type || inferType(column.field);
  const value = resolveColumnValue(mod, column);
  if (value === '') return '';

  if (type === 'link') {
    const relPath = path.posix.relative(targetDirRel, mod.path ?? `${mod.dir}/index.md`);
    let href = encodeURI(relPath);
    if (opts.anchor) href += '#' + opts.anchor;
    return `[${escapeLinkText(value)}](${href})`;
  }
  if (type === 'code') {
    return '`' + value.replace(/`/g, '\\`') + '`';
  }
  return escapeCellText(value);
}

function renderTable(
  columns: ColumnDef[],
  moduleDirs: string[],
  catalog: CatalogSnapshot,
  targetDirRel: string,
  opts: ParsedArgv,
): string {
  const headers = columns.map(c => c.label || c.field);
  const rows: string[][] = [];
  for (const modDir of moduleDirs) {
    const mod = catalog.modules[modDir];
    if (!mod) continue;
    rows.push(columns.map(col => renderCell(mod, col, targetDirRel, opts)));
  }

  const widths = headers.map((h, i) => {
    let w = h.length;
    for (const r of rows) {
      const len = (r[i] || '').length;
      if (len > w) w = len;
    }
    return Math.max(w, 3);
  });

  const pad = (s: string, w: number): string => s + ' '.repeat(Math.max(0, w - s.length));
  const lines: string[] = [];
  lines.push('| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |');
  lines.push('| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |');
  for (const r of rows) {
    lines.push('| ' + r.map((c, i) => pad(c || '', widths[i])).join(' | ') + ' |');
  }
  return lines.join('\n') + '\n';
}

function ensureInclude(content: string, outName: string): { content: string; changed: boolean } {
  const line = `{% include [modules](./${outName}) %}`;
  if (content.includes(line)) return { content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trimmed = content.replace(/\s+$/, '');
  return { content: trimmed + eol + eol + line + eol, changed: true };
}