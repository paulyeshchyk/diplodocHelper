import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Path_ToPosix } from '../../utils/path/Path_ToPosix.ts';
import { String_Compare_Natural } from '../../utils/string/String_Compare_Natural.ts';
import { loadFields } from '../_fields.ts';
import { loadLayout } from '../_layout.ts';
import { DOCS_DIR, GENERATED_DIR } from '../_paths.ts';
import type {
  CatalogModule,
  CatalogSnapshot,
} from '../emit-feature-map/feature-map.types.ts';

const HELP = `
Использование: node emit-modules-table.js [options]

Строит modules-table.<lang>.json из catalog.<lang>.json — плоский массив
записей в формате, совместимом с json-to-md (--schema modules).

Опции:
  --lang=<ru|en>     язык (по умолчанию ru)
  --catalog=<path>   catalog.json (по умолчанию <generatedDir>/catalog.<lang>.json)
  --out=<path>       куда писать JSON (по умолчанию <generatedDir>/modules-table.<lang>.json)
  --out-dir=<path>   папка, где будет лежать итоговый .md
                     (базис для относительных ссылок).
                     По умолчанию — из layout.json (Модули/Реестр)
  --anchor=<name>    якорь для ссылок на модули (например naznachenie)
  --sort=<field>     id | ident | folder (по умолчанию id, natural sort)
                     ⚠️ в текущей реализации не влияет на сортировку
                     (сохранено для back-compat, всегда natural по id)
  --verbose          подробный вывод
  -h, --help         справка
`;

export interface RunEmitModulesTableOptions {
  docsDir?: string;
  generatedDir?: string;
}

interface ParsedArgv {
  lang: string;
  catalog: string | null;
  out: string | null;
  outDir: string | null;
  anchor: string;
  sort: 'id' | 'ident' | 'folder';
  verbose: boolean;
  help: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runEmitModulesTable(
  argv: string[],
  options: RunEmitModulesTableOptions = {},
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

  const docsDir = options.docsDir ?? DOCS_DIR;
  const generatedDir = options.generatedDir ?? GENERATED_DIR;
  const layout = loadLayout(path.join(docsDir, '_registry', 'layout.json'));

  const catalogPath = opts.catalog
    ? path.resolve(opts.catalog)
    : path.join(generatedDir, `catalog.${opts.lang}.json`);
  const outPath = opts.out
    ? path.resolve(opts.out)
    : path.join(generatedDir, `modules-table.${opts.lang}.json`);

  console.log('=== emit-modules-table ===');
  console.log(`catalog: ${catalogPath}`);

  let catalog: CatalogSnapshot;
  try {
    catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CatalogSnapshot;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Не удалось прочитать каталог: ${msg}`);
  }

  const docsRoot = path.resolve(catalog.docsRoot);
  const urlPrefix = getUrlPrefix(docsRoot, docsDir);

  // outDirAbs — базис для relative-links. Имеет значение ТОЛЬКО когда
  // urlPrefix === null (docsRoot за пределами docsDir). При обычном
  // запуске (MES, diplodoc-helper) urlPrefix задан — модуль пишет
  // абсолютные пути вида `/ru/Модули/…` и outDirAbs игнорируется.
  const outDirAbs = opts.outDir
    ? path.resolve(opts.outDir)
    : path.join(
      docsDir,
      opts.lang,
      ...(layout.modulesFolder ? [layout.modulesFolder] : []),
      layout.outFolder,
    );
  const outDirRel = Path_ToPosix.convert(path.relative(docsRoot, outDirAbs));

  const effectivePrefix = urlPrefix || null;

  console.log(`docsRoot: ${docsRoot}`);
  console.log(`urlPrefix: ${effectivePrefix || '(relative, outDirRel=' + outDirRel + ')'}`);
  console.log(`out:     ${outPath}`);
  console.log(`outDir:  ${outDirAbs}`);

  // fieldsPath — per-docsDir. Иначе loadFields() читает DOCS_DIR из _paths.ts
  // (для options.docsDir != DOCS_DIR это даёт «чужие» поля — тесты, второй проект).
  const fieldsPath = path.join(docsDir, '_registry', 'fields.yaml');
  const fields = loadFields(fieldsPath);

  const rows: Array<Record<string, unknown>> = [];

  for (const mod of Object.values(catalog.modules || {})) {
    const row: Record<string, unknown> = {};

    for (const [key, f] of Object.entries(fields)) {
      if (f.kind === 'multi' && f.dimension) {
        const dimension = f.dimension;
        const dimField = f.dimField || key;

        row[key] = effectivePrefix
          ? renderDimensions(mod, dimField, dimension, catalog, effectivePrefix)
          : renderDimensions(mod, dimField, dimension, catalog, outDirRel);

        row[`${dimField}_arr`] = effectivePrefix
          ? dimArray(mod, dimField, dimension, catalog, effectivePrefix)
          : dimArray(mod, dimField, dimension, catalog, outDirRel);
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

    row.id_plain = mod.id || '';
    row.ident_plain = mod.ident || '';
    row.layer_plain = plainDim(mod, 'layers', catalog, 'layer');
    row.family_plain = plainDim(mod, 'families', catalog, 'family');
    row.capability_plain = plainDim(mod, 'capabilities', catalog, 'capability');
    row.treemapLabel = treemapLabel(mod);
    row._sortKey = mod.id || '';

    rows.push(row);
  }

  rows.sort((a, b) => {
    const sa = String(a._sortKey ?? '');
    const sb = String(b._sortKey ?? '');
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    return String_Compare_Natural.compare(sa, sb);
  });
  for (const r of rows) delete r._sortKey;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');

  console.log(`Записано записей: ${rows.length}`);
  console.log(`✅ ${outPath}`);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgv(argv: string[]): ParsedArgv {
  const opts: ParsedArgv = {
    lang: 'ru',
    catalog: null,
    out: null,
    outDir: null,
    anchor: '',
    sort: 'id',
    verbose: false,
    help: false,
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
    else if (a.startsWith('--sort=')) opts.sort = a.slice('--sort='.length) as ParsedArgv['sort'];
    else if (a === '--sort') opts.sort = argv[++i] as ParsedArgv['sort'];
    else throw new Error(`Неизвестная опция: ${a}`);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Path / URL helpers
// ---------------------------------------------------------------------------

function getUrlPrefix(docsRoot: string, docsDir: string): string | null {
  const rel = path.relative(docsDir, docsRoot);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return '/' + Path_ToPosix.convert(rel).replace(/^\/+|\/+$/g, '');
}

// ---------------------------------------------------------------------------
// Cell renderers
// ---------------------------------------------------------------------------

function escapeLinkText(s: string): string {
  return String(s).replace(/\r?\n/g, ' ').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function makeLink(text: string, href: string): string {
  return `[${escapeLinkText(text)}](${encodeURI(href)})`;
}

function codeWrap(value: unknown): string {
  const str = String(value).trim();
  if (!str) return '';
  return '`' + str.replace(/`/g, '\\`') + '`';
}

function renderId(mod: CatalogModule, urlPrefix: string, anchor: string): string {
  if (!mod.id) return '';
  let href = `${urlPrefix}/${mod.path}`.replace(/\.md$/, '.html');
  if (anchor) href += '#' + anchor;
  return makeLink(mod.id, href);
}

function renderDimensions(
  mod: CatalogModule,
  field: string,
  dimName: string,
  catalog: CatalogSnapshot,
  urlPrefix: string,
): string {
  const raw = mod[field];
  const slugs: string[] = Array.isArray(raw) ? (raw as string[]) : [];
  if (slugs.length === 0) return '';

  const items = catalog.dimensions[dimName]?.items ?? {};
  const parts: string[] = [];
  for (const slug of slugs) {
    const item = items[slug];
    if (!item) {
      parts.push(codeWrap(slug));
      continue;
    }
    const href = `${urlPrefix}/${item.dir}/index.md`.replace(/\.md$/, '.html');
    parts.push(makeLink(item.title || slug, href));
  }
  return parts.join(' / ');
}

interface DimEntry {
  slug: string;
  title: string;
  link: string;
}

function dimArray(
  mod: CatalogModule,
  field: string,
  dimName: string,
  catalog: CatalogSnapshot,
  urlPrefix: string,
): DimEntry[] {
  const raw = mod[field];
  const slugs: string[] = Array.isArray(raw) ? (raw as string[]) : [];
  if (slugs.length === 0) return [];

  const items = catalog.dimensions[dimName]?.items ?? {};
  const out: DimEntry[] = [];
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

function moduleHref(mod: CatalogModule, urlPrefix: string, anchor: string): string {
  let href = `${urlPrefix}/${mod.path}`.replace(/\.md$/, '.html');
  if (anchor) href += '#' + anchor;
  return encodeURI(href);
}

function plainDim(
  mod: CatalogModule,
  field: string,
  catalog: CatalogSnapshot,
  dimName: string,
): string {
  const raw = mod[field];
  const slugs: string[] = Array.isArray(raw) ? (raw as string[]) : [];
  if (slugs.length === 0) return '';
  const items = catalog.dimensions[dimName]?.items ?? {};
  return slugs.map(slug => items[slug]?.title || slug).join(' / ');
}

// ---------------------------------------------------------------------------
// Scalar formatters
// ---------------------------------------------------------------------------

function treemapLabel(mod: CatalogModule): string {
  const parts: string[] = [];
  if (mod.id) parts.push(String(mod.id).trim());
  if (mod.ident) parts.push(String(mod.ident).trim());
  return parts.join(' ');
}

function formatScalar(style: 'plain' | 'backtick' | 'double', value: unknown): string {
  const str = String(value).trim();
  if (!str) return '';
  switch (style) {
    case 'backtick': return '`' + str.replace(/`/g, '\\`') + '`';
    case 'double': return '"' + str.replace(/"/g, '\\"') + '"';
    case 'plain':
    default: return str;
  }
}

function renderFolder(mod: CatalogModule): string {
  const raw = mod.folder;
  if (raw == null) return '';
  const str = String(raw);
  if (!str.trim()) return '';
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return codeWrap(parts[0]);
  return parts.map(codeWrap).join(' / ');
}