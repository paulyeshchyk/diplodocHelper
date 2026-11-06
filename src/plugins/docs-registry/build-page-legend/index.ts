import yaml from 'js-yaml';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Frontmatter_Split_Raw } from '../../utils/frontmatter/Frontmatter_Split_Raw.ts';
import { Path_ToPosix } from '../../utils/path/Path_ToPosix.ts';
import { DOCS_DIR, GENERATED_DIR } from '../_paths.ts';
import type {
    CatalogModule,
    CatalogSnapshot,
} from '../emit-feature-map/feature-map.types.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldStyle = 'plain' | 'backtick' | 'single' | 'double';
type FieldType = 'auto' | 'array';

interface FieldContext {
    catalog: CatalogSnapshot | null;
    /** posix-относительный путь от `catalog.docsRoot` до папки модуля. */
    moduleDirRel: string | null;
    unknowns: Array<{ field: string; dim: string; slug: string }>;
}

export interface RunBuildPageLegendOptions {
    docsDir?: string;
    registryDir?: string;
    generatedDir?: string;
}

interface ParsedArgv {
    lang: string;
    rootDir: string | null;   // deprecated
    catalog: string | null;
    skipUnknown: boolean;
    rewrite: boolean;
    withInclude: boolean;
    order: 'custom' | 'ascending' | 'descending' | 'none';
    ignore: ReadonlySet<string>;
    dryRun: boolean;
    verbose: boolean;
    help: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROPERTY_ALIASES: Readonly<Record<string, string>> = {
    ID: 'UID',
    Идентификатор: 'UID (vscode)',
    pureTitle: 'Название',
    title: 'Заголовок',
    sectionType: 'Тип раздела',
    capability: 'Каталог',
    family: 'Семейство',
    layer: 'Слой',
    designation: 'Предназначение',
    actor: 'Актор',
};

const PROPERTY_FORMAT: Readonly<Record<string, FieldStyle>> = {
    ID: 'plain',
    pureTitle: 'plain',
    designation: 'plain',
    Идентификатор: 'backtick',
    layer: 'backtick',
    capability: 'backtick',
    family: 'backtick',
    folder: 'backtick',
    entrypoint: 'backtick',
    version: 'backtick',
    input: 'backtick',
    output: 'backtick',
};

const PROPERTY_TYPE: Readonly<Record<string, FieldType>> = {
    layer: 'array',
    capability: 'array',
    family: 'array',
    folder: 'array',
    input: 'array',
    output: 'array',
    actor: 'array',
};

const PROPERTY_JOIN: Readonly<Record<string, string>> = {
    layer: ' / ',
    folder: '; ',
    entrypoint: '; ',
};
const DEFAULT_JOIN = ' + ';

const DIM_MAP: Readonly<Record<string, string>> = {
    family: 'family',
    layer: 'layer',
    capability: 'capability',
};

const CUSTOM_ORDER: ReadonlyArray<string> = [
    'ID',
    'ID_Group',
    'ID_Type',
    'Идентификатор',
    'title',
    'designation',
    'sectionType',
    'capability',
    'family',
    'layer',
    'folder',
    'entrypoint',
    'role',
    'version',
    'actor',
];

const INCLUDE_LINE = '{% include [legend](./page-legend.md) %}';

const HELP = `
Использование: node build-page-legend [options]

Опции:
  --lang=<ru|en>        язык (по умолчанию ru)
  --catalog=<path>      catalog.json (по умолчанию <generatedDir>/catalog.<lang>.json)
  --skip-unknown        не падать на неизвестных slug (рендерить как \\\`code\\\`)
  --rewrite             перезаписывать page-legend.md
  --with-include        добавлять {% include [legend](./page-legend.md) %} в index.md
  --order=<mode>        custom | ascending | descending | none  (по умолчанию custom)
  --ignore=<list>       свойства через запятую, не попадут в legend
  --dry-run             ничего не писать
  --verbose             подробный вывод
  -h, --help            справка

Deprecated:
  --root-dir=<path>     не используется (модули берутся из catalog.modules)
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runBuildPageLegend(
    argv: string[],
    options: RunBuildPageLegendOptions = {},
): Promise<void> {
    const opts = parseArgv(argv);
    if (opts.help) {
        console.log(HELP);
        return;
    }

    if (opts.rootDir) {
        console.warn(
            '[build-page-legend] --root-dir устарел и игнорируется: модули берутся из catalog.modules.',
        );
    }

    const docsDir = options.docsDir ?? DOCS_DIR;
    const generatedDir = options.generatedDir ?? GENERATED_DIR;

    const catalogPath = opts.catalog
        ? path.resolve(opts.catalog)
        : path.join(generatedDir, `catalog.${opts.lang}.json`);

    let catalog: CatalogSnapshot;
    try {
        catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CatalogSnapshot;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Не удалось прочитать каталог (${catalogPath}): ${msg}`);
    }

    console.log('=== build-page-legend ===');
    console.log(`catalog:  ${catalogPath}`);
    console.log(`Найдено ${Object.keys(catalog.modules).length} модулей`);

    // Итерируем по catalog.modules — источник правды, никаких FS-обходов.
    // docsRoot — от каталога; путь модуля — `mod.path` (relative) или
    // fallback `mod.dir + '/index.md'`.
    const moduleFiles: Array<{ filePath: string; mod: CatalogModule }> = [];
    for (const [dir, mod] of Object.entries(catalog.modules)) {
        const rel = mod.path ?? `${dir}/index.md`;
        moduleFiles.push({
            filePath: path.join(catalog.docsRoot, rel),
            mod,
        });
    }

    // --- processFile для каждого модуля ---
    const results: Array<{
        filePath: string;
        status: 'ok' | 'skip' | 'error';
        action?: 'created' | 'updated' | 'unchanged' | 'outdated';
        reason?: string;
        unknowns?: FieldContext['unknowns'];
        legendPath?: string;
        legendContent?: string;
        indexMdPath?: string;
        indexMdContent?: string;
    }> = [];

    for (const { filePath } of moduleFiles) {
        results.push(await processFile(filePath, catalog, opts));
    }

    const allUnknowns = results.flatMap(r => r.unknowns ?? []);
    if (allUnknowns.length > 0 && !opts.skipUnknown) {
        printUnknownError(allUnknowns, catalog.registryPath ?? '(unknown)');
        throw new Error(
            `Ошибка валидации: ${allUnknowns.length} неизвестных значений (детали — stderr)`,
        );
    }

    // --- отчёт ---
    const counts = { created: 0, updated: 0, unchanged: 0, outdated: 0, skip: 0, error: 0 };
    for (const r of results) {
        const rel = path.relative(process.cwd(), r.filePath);
        if (r.status === 'skip') {
            counts.skip++;
            if (opts.verbose) console.log(`  - ${rel} — ${r.reason}`);
            continue;
        }
        if (r.status === 'error') {
            counts.error++;
            console.error(`  ✗ ${rel} — ${r.reason}`);
            continue;
        }
        counts[r.action!]++;
        const extra = r.indexMdPath ? ', include+' : '';
        const warn = r.unknowns && r.unknowns.length ? `, unknown=${r.unknowns.length}` : '';
        const tag = { created: '＋', updated: '↻', unchanged: '=', outdated: '⚠' }[r.action!];
        console.log(`  ${tag} ${rel}  [${r.action}${extra}${warn}]`);

        if (opts.dryRun) continue;
        if (r.action === 'created' || r.action === 'updated') {
            await fs.writeFile(r.legendPath!, r.legendContent!, 'utf8');
        }
        if (r.indexMdPath) {
            await fs.writeFile(r.indexMdPath, r.indexMdContent!, 'utf8');
        }
    }

    console.log('\nИтог:');
    console.log(`  создано: ${counts.created}, обновлено: ${counts.updated}`);
    console.log(`  без изменений: ${counts.unchanged}, устаревших: ${counts.outdated}`);
    console.log(`  пропущено: ${counts.skip}, ошибок: ${counts.error}`);
    if (opts.dryRun) console.log('\nDRY-RUN: файлы не записаны');
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function parseArgv(argv: string[]): ParsedArgv {
    const opts: ParsedArgv = {
        lang: 'ru',
        rootDir: null,
        catalog: null,
        skipUnknown: false,
        rewrite: false,
        withInclude: false,
        order: 'custom',
        ignore: new Set(),
        dryRun: false,
        verbose: false,
        help: false,
    };
    const positional: string[] = [];
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
        else if (a.startsWith('--root-dir=')) opts.rootDir = a.slice('--root-dir='.length);
        else if (a === '--root-dir') opts.rootDir = argv[++i];
        else if (a.startsWith('--catalog=')) opts.catalog = a.slice('--catalog='.length);
        else if (a === '--catalog') opts.catalog = argv[++i];
        else if (a.startsWith('--order=')) opts.order = a.slice('--order='.length) as ParsedArgv['order'];
        else if (a === '--order') opts.order = argv[++i] as ParsedArgv['order'];
        else if (a.startsWith('--ignore=')) opts.ignore = splitList(a.slice('--ignore='.length));
        else if (a === '--ignore') opts.ignore = splitList(argv[++i]);
        else if (!a.startsWith('-')) positional.push(a);
        else throw new Error(`Неизвестная опция: ${a}`);
    }
    if (positional[0] && !opts.rootDir) opts.rootDir = positional[0];

    const allowed = new Set(['custom', 'ascending', 'descending', 'none']);
    if (!allowed.has(opts.order)) {
        throw new Error('--order: допустимо custom|ascending|descending|none');
    }
    return opts;
}

function splitList(s: string): Set<string> {
    return new Set(
        String(s).split(',').map(x => x.trim()).filter(Boolean),
    );
}

async function fileExists(p: string): Promise<boolean> {
    try { await fs.access(p); return true; } catch { return false; }
}

interface ProcessFileResult {
    filePath: string;
    status: 'ok' | 'skip' | 'error';
    action?: 'created' | 'updated' | 'unchanged' | 'outdated';
    reason?: string;
    unknowns?: FieldContext['unknowns'];
    legendPath?: string;
    legendContent?: string;
    indexMdPath?: string;
    indexMdContent?: string;
}

async function processFile(
    filePath: string,
    catalog: CatalogSnapshot,
    opts: ParsedArgv,
): Promise<ProcessFileResult> {
    const raw = await fs.readFile(filePath, 'utf8');
    const hasBom = raw.charCodeAt(0) === 0xfeff;
    const content = hasBom ? raw.slice(1) : raw;

    const parts = Frontmatter_Split_Raw.split(content);
    if (!parts) return { filePath, status: 'skip', reason: 'нет frontmatter' };

    let fm: Record<string, unknown>;
    try {
        const loaded = yaml.load(parts.frontmatter) || {};
        if (typeof loaded !== 'object' || Array.isArray(loaded)) {
            return { filePath, status: 'error', reason: 'frontmatter не объект' };
        }
        fm = loaded as Record<string, unknown>;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { filePath, status: 'error', reason: `невалидный YAML: ${msg}` };
    }

    const moduleDirRel = Path_ToPosix.convert(
        path.relative(catalog.docsRoot, path.dirname(filePath)),
    );

    const ctx: FieldContext = {
        catalog,
        moduleDirRel,
        unknowns: [],
    };

    const legendContent = renderLegend(fm, opts, ctx);
    if (legendContent === null) {
        return { filePath, status: 'skip', reason: 'пусто после --ignore', unknowns: ctx.unknowns };
    }

    const legendPath = path.join(path.dirname(filePath), 'page-legend.md');
    const existing = (await fileExists(legendPath)) ? await fs.readFile(legendPath, 'utf8') : null;

    let action: 'created' | 'updated' | 'unchanged' | 'outdated';
    if (existing === legendContent) action = 'unchanged';
    else if (existing !== null && !opts.rewrite) action = 'outdated';
    else action = existing !== null ? 'updated' : 'created';

    const inc = opts.withInclude ? ensureInclude(content) : { content, changed: false };

    return {
        filePath,
        status: 'ok',
        action,
        unknowns: ctx.unknowns,
        legendPath,
        legendContent,
        indexMdPath: inc.changed ? filePath : undefined,
        indexMdContent: inc.changed ? (hasBom ? '\uFEFF' : '') + inc.content : undefined,
    };
}

function renderLegend(
    frontmatter: Record<string, unknown>,
    opts: ParsedArgv,
    ctx: FieldContext,
): string | null {
    let entries = Object.entries(frontmatter);
    if (opts.ignore.size) entries = entries.filter(([k]) => !opts.ignore.has(k));
    entries = entries.filter(([, v]) => !isEmptyValue(v));
    entries = sortEntries(entries, opts.order);
    if (entries.length === 0) return null;

    const rows = entries.map(([k, v]) => {
        const label = PROPERTY_ALIASES[k] || k;
        return [label, formatLegendValue(k, v, ctx)];
    });

    const col1W = Math.max(3, ...rows.map(([k]) => k.length));
    const col2W = Math.max(3, ...rows.map(([, v]) => v.length));
    const pad = (s: string, w: number): string => s + ' '.repeat(Math.max(0, w - s.length));

    const lines: string[] = [];
    lines.push(`| ${' '.repeat(col1W)} | ${' '.repeat(col2W)} |`);
    lines.push(`| ${'-'.repeat(col1W)} | ${'-'.repeat(col2W)} |`);
    for (const [k, v] of rows) lines.push(`| ${pad(k, col1W)} | ${pad(v, col2W)} |`);
    lines.push('');
    lines.push('{: .page-legend }');
    lines.push('');
    return lines.join('\n');
}

function isEmptyValue(val: unknown): boolean {
    if (val == null) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
}

function sortEntries(
    entries: Array<[string, unknown]>,
    order: ParsedArgv['order'],
): Array<[string, unknown]> {
    if (order === 'none') return entries;
    if (order === 'ascending') {
        return [...entries].sort(([a], [b]) => String(a).localeCompare(String(b), 'ru'));
    }
    if (order === 'descending') {
        return [...entries].sort(([a], [b]) => String(b).localeCompare(String(a), 'ru'));
    }
    const idx = new Map(CUSTOM_ORDER.map((k, i) => [k, i]));
    const known: Array<[string, unknown]> = [];
    const unknown: Array<[string, unknown]> = [];
    for (const e of entries) (idx.has(e[0]) ? known : unknown).push(e);
    known.sort((a, b) => (idx.get(a[0]) ?? 0) - (idx.get(b[0]) ?? 0));
    return [...known, ...unknown];
}

function stripExistingWrap(str: string): string {
    const s = String(str).trim();
    if (s.length < 2) return s;
    const f = s[0];
    const l = s[s.length - 1];
    if ((f === '`' || f === "'" || f === '"') && f === l) return s.slice(1, -1);
    return s;
}

function formatScalar(key: string, value: unknown): string {
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

function parseArrayValue(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(v => (v == null ? '' : String(v))).filter(v => v.trim() !== '');
    if (value == null) return [];
    const s = String(value);
    if (s.trim() === '') return [];
    return s.split(',').map(x => x.trim()).filter(Boolean);
}

function formatDimensionLink(ctx: FieldContext, dimName: string, slug: string): string | null {
    const item = ctx.catalog?.dimensions?.[dimName]?.items?.[slug];
    if (!item) return null;
    const dimIndexRel = path.posix.join(item.dir, 'index.md');
    const relPath = path.posix.relative(ctx.moduleDirRel ?? '', dimIndexRel);
    return `[${slug}](${encodeURI(relPath)})`;
}

function formatLegendValue(key: string, value: unknown, ctx: FieldContext): string {
    const dimName = DIM_MAP[key];
    if (dimName && ctx.catalog) {
        const parts = parseArrayValue(value);
        if (parts.length === 0) return '';
        const sep = PROPERTY_JOIN[key] || DEFAULT_JOIN;
        return parts
            .map(slug => {
                const link = formatDimensionLink(ctx, dimName, slug);
                if (link === null) {
                    ctx.unknowns.push({ field: key, dim: dimName, slug });
                    return '`' + slug + '`';
                }
                return link;
            })
            .join(sep);
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

function ensureInclude(content: string): { content: string; changed: boolean } {
    if (content.includes(INCLUDE_LINE)) return { content, changed: false };
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const trimmed = content.replace(/\s+$/, '');
    return { content: trimmed + eol + eol + INCLUDE_LINE + eol, changed: true };
}

function printUnknownError(
    unknowns: FieldContext['unknowns'],
    registryPath: string,
): void {
    const grouped: Record<string, { dim: string; slug: string; files: string[] }> = {};
    for (const u of unknowns) {
        const key = `${u.dim}.${u.slug}`;
        if (!grouped[key]) grouped[key] = { dim: u.dim, slug: u.slug, files: [] };
        grouped[key].files.push(u.field);
    }
    console.error(`\n❌ Ошибка валидации: ${unknowns.length} неизвестных значений\n`);
    for (const g of Object.values(grouped)) {
        console.error(`  ${g.dim}: "${g.slug}"`);
    }
    console.error(`\n📖 Откройте ${registryPath}`);
    console.error(`  или используйте --skip-unknown — запишет с бэктиками.`);
}