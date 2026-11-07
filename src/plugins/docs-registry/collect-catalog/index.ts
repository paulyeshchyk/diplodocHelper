import yaml from 'js-yaml';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Frontmatter_Split_Raw } from '../../utils/frontmatter/Frontmatter_Split_Raw.ts';
import { Fs_Find_Module_Dirs } from '../../utils/fs/Fs_Find_Module_Dirs.ts';
import { Path_ToPosix } from '../../utils/path/Path_ToPosix.ts';
import { String_Compare_Natural } from '../../utils/string/String_Compare_Natural.ts';
import { loadFields} from '../_fields.ts';
import type { PathConfig } from '../_fields.ts';
import { loadLayout } from '../_layout.ts';
import { DOCS_DIR, GENERATED_DIR, REGISTRY_DIR } from '../_paths.ts';
import type {
    CatalogDimension,
    CatalogModule,
} from '../emit-feature-map/feature-map.types.ts';

const HELP = `
Использование: node collect-catalog.js [options]

Собирает инвертированный индекс модулей по измерениям и пишет catalog.json.

Опции:
  --lang=<ru|en>          язык (по умолчанию ru)
  --docs-root=<path>      корень модулей (по умолчанию <docs>/<lang>/Модули)
  --registry=<path>       реестр (по умолчанию <docs>/_registry/<lang>.yaml → dimensions.yaml)
  --out=<path>            куда писать (по умолчанию <docs>/_generated/catalog.<lang>.json)
  --module-prefix=<pfx>   префикс папки модуля (по умолчанию "Модуль")
  --lenient               не падать на неизвестных slug (для отладки)
  --probe                 показать найденное, ничего не писать
  --dry-run               не писать catalog.json
  --verbose               все warnings
  -h, --help              справка
`;

export interface CollectCatalogOptions {
    /** Дефолт для `docsRoot`, если `--docs-root` не задан. */
    docsDir?: string;
    /** Дефолт для fallback-кандидатов `resolveRegistryPath`. */
    registryDir?: string;
    /** Дефолт для `--out`. */
    generatedDir?: string;
}

export interface ParsedArgv {
    lang: string;
    docsRoot: string | null;
    registry: string | null;
    out: string | null;
    /** `null` — не задан (layout даст дефолт); `''` — явно walk all. */
    modulePrefix: string | null;
    lenient: boolean;
    probe: boolean;
    dryRun: boolean;
    verbose: boolean;
    help: boolean;
}

export interface CatalogFile {
    generatedAt: string;
    docsRoot: string;
    lang: string;
    version: number;
    registryPath: string;
    modules: Record<string, CatalogModule>;
    dimensions: Record<string, CatalogDimension>;
    index: Record<string, Record<string, string[]>>;
    warnings: string[];
}

interface UnknownDimSlug {
    modDir: string;
    dim: string;
    slug: string;
}

const SKIP_DIRS: ReadonlySet<string> = new Set([
    'node_modules',
    '.git',
    '_generated',
    '_includes',
    '_registry',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseArgv(argv: string[]): ParsedArgv {
    const opts: ParsedArgv = {
        lang: 'ru',
        docsRoot: null,
        registry: null,
        out: null,
        modulePrefix: null,
        lenient: false,
        probe: false,
        dryRun: false,
        verbose: false,
        help: false,
    };
    const positional: string[] = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--lenient') opts.lenient = true;
        else if (a === '--probe') opts.probe = true;
        else if (a === '--dry-run') opts.dryRun = true;
        else if (a === '--verbose') opts.verbose = true;
        else if (a === '-h' || a === '--help') opts.help = true;
        else if (a.startsWith('--lang=')) opts.lang = a.slice('--lang='.length);
        else if (a === '--lang') opts.lang = argv[++i];
        else if (a.startsWith('--docs-root=')) opts.docsRoot = a.slice('--docs-root='.length);
        else if (a === '--docs-root') opts.docsRoot = argv[++i];
        else if (a.startsWith('--registry=')) opts.registry = a.slice('--registry='.length);
        else if (a === '--registry') opts.registry = argv[++i];
        else if (a.startsWith('--out=')) opts.out = a.slice('--out='.length);
        else if (a === '--out') opts.out = argv[++i];
        else if (a.startsWith('--module-prefix=')) opts.modulePrefix = a.slice('--module-prefix='.length);
        else if (a === '--module-prefix') opts.modulePrefix = argv[++i];
        else if (!a.startsWith('-')) positional.push(a);
        else throw new Error(`Неизвестная опция: ${a}`);
    }
    if (positional[0] && !opts.docsRoot) opts.docsRoot = positional[0];
    return opts;
}

export function parseListValue(v: unknown): string[] {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
    const s = String(v).trim();
    if (!s) return [];
    return s.split(',').map(x => x.trim()).filter(Boolean);
}

export async function resolveRegistryPath(
    lang: string,
    explicit: string | null,
    registryDir: string = REGISTRY_DIR,
): Promise<string> {
    if (explicit) return path.resolve(explicit);
    const candidates = [
        path.join(registryDir, lang + '.yaml'),
        path.join(registryDir, 'dimensions.yaml'),
    ];
    for (const c of candidates) {
        try {
            await fs.access(c);
            return c;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[collect-catalog] resolveRegistryPath:' + msg);
        }
    }
    return candidates[0];
}

export async function runCollectCatalog(
    argv: string[],
    options: CollectCatalogOptions = {},
): Promise<void> {
    const opts = parseArgv(argv);
    if (opts.help) {
        console.log(HELP);
        return;
    }

    const docsDir = options.docsDir ?? DOCS_DIR;
    const registryDir = options.registryDir ?? REGISTRY_DIR;
    const generatedDir = options.generatedDir ?? GENERATED_DIR;
    const fieldsPath = path.join(docsDir, '_registry', 'fields.yaml');
    const layoutPath = path.join(docsDir, '_registry', 'layout.json');
    const layout = loadLayout(layoutPath);

    const docsRoot = opts.docsRoot
        ? path.resolve(opts.docsRoot)
        : layout.modulesFolder
            ? path.join(docsDir, opts.lang, layout.modulesFolder)
            : path.join(docsDir, opts.lang);

    // prefix: --module-prefix явно → приоритет; иначе layout.modulePrefix
    // (null → walk all). '' из CLI → тоже walk all.
    const effectivePrefix =
        opts.modulePrefix !== null
            ? (opts.modulePrefix || undefined)
            : (layout.modulePrefix ?? undefined);

    const registryPath = await resolveRegistryPath(opts.lang, opts.registry, registryDir);
    const outPath = opts.out
        ? path.resolve(opts.out)
        : path.join(generatedDir, `catalog.${opts.lang}.json`);

    console.log('=== collect-catalog ===');
    console.log(`docsRoot: ${docsRoot}`);
    console.log(`registry: ${registryPath}`);
    console.log(`out:      ${outPath}`);
    console.log('');

    try {
        const st = await fs.stat(docsRoot);
        if (!st.isDirectory()) throw 0;
    } catch {
        throw new Error(`docsRoot не существует или не каталог: ${docsRoot}`);
    }

    let registry: { dimensions?: Record<string, CatalogDimension> } | null | undefined;
    try {
        registry = yaml.load(await fs.readFile(registryPath, 'utf8')) as
            | { dimensions?: Record<string, CatalogDimension> }
            | null
            | undefined;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Не удалось прочитать реестр: ${msg}`);
    }
    if (!registry || !registry.dimensions) {
        throw new Error(`Реестр ${registryPath} не содержит .dimensions`);
    }

    const modules: Record<string, CatalogModule> = {};
    const warnings: string[] = [];

    // excludeDirs — все dir из dimensions.<dim>.items.<slug>.dir.
    // Это страницы измерений (Акторы/АкторЧитатель, Manufacturers/Apple, …):
    // у них тоже есть index.md, но это не модули.
    const excludeDirs = new Set<string>();
    for (const dim of Object.values(registry.dimensions)) {
        for (const item of Object.values(dim.items || {})) {
            if (item.dir) excludeDirs.add(item.dir);
        }
    }

    const effectiveSkipDirs = layout.skipDirs.length > 0
        ? new Set<string>([...SKIP_DIRS, ...layout.skipDirs])
        : SKIP_DIRS;

    const foundDirs = Fs_Find_Module_Dirs.findSync({
        rootDir: docsRoot,
        prefix: effectivePrefix,
        excludeDirs,
        skipDirNames: effectiveSkipDirs,
        indexFileName: layout.moduleIndexFile,
    });

    for (const dir of foundDirs) {
        const filePath = path.join(dir, 'index.md');
        const raw = await fs.readFile(filePath, 'utf8');
        const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
        const parts = Frontmatter_Split_Raw.split(content);
        const relFile = Path_ToPosix.convert(path.relative(docsRoot, filePath));

        if (!parts) {
            warnings.push(`${relFile}: нет frontmatter`);
            continue;
        }




        let fm: Record<string, unknown>;
        try {
            // yaml.load(..) || {} — сохраняем legacy: null/undefined/'' → {}.
            // Только primitives (string/number/bool) и массивы дают warning.
            const loaded = (yaml.load(parts.frontmatter) || {}) as unknown;
            if (typeof loaded !== 'object' || Array.isArray(loaded)) {
                warnings.push(`${relFile}: frontmatter не объект`);
                continue;
            }
            fm = loaded as Record<string, unknown>;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            warnings.push(`${relFile}: невалидный YAML: ${msg}`);
            continue;
        }


        // moduleSectionTypes: если задан — оставляем только эти sectionType.
        // Для MES `["Page"]` отсеивает Части/Разделы/Главы (у них
        // sectionType: Part / Section / Chapter).
        if (layout.moduleSectionTypes && layout.moduleSectionTypes.length > 0) {
            const st = fm['sectionType'];
            if (typeof st !== 'string' || !layout.moduleSectionTypes.includes(st)) {
                continue;
            }
        }

        const relDir = Path_ToPosix.convert(path.relative(docsRoot, dir));
        const mod: CatalogModule = {
            dir: relDir,
            path: relDir + '/index.md',
            id: '',
            ident: '',
            designation: '',
            chipLabelField: '',
        };

        // Defaults для service-полей (back-compat — если fields.yaml их не объявил).
        mod.id = fm['id'] != null ? String(fm['id']) : '';
        mod.ident = fm['ident'] != null ? String(fm['ident']) : '';
        mod.designation = fm['designation'] != null ? String(fm['designation']) : '';

        const fields = loadFields(fieldsPath);

        // Frontmatter-поля (включая service с frontmatterKey).
        for (const [key, f] of Object.entries(fields)) {
            const source = f.source ?? 'frontmatter';
            if (source === 'path') continue;
            const fmKey = f.frontmatterKey || key;
            const raw2 = fm[fmKey];
            if (f.kind === 'multi') {
                mod[f.dimField || key] = parseListValue(raw2);
            } else if (raw2 != null) {
                mod[key] = String(raw2);
            }
        }

        // Path-extractors (source: 'path' | 'frontmatter-or-path').
        for (const [key, f] of Object.entries(fields)) {
            const source = f.source ?? 'frontmatter';
            if (source !== 'path' && source !== 'frontmatter-or-path') continue;
            if (!f.dimension || !f.dimField) continue;

            const already = mod[f.dimField];
            if (source === 'frontmatter-or-path' && Array.isArray(already) && already.length > 0) {
                continue;
            }

            const slugs = extractPathSlugs(relDir, f.path);
            if (slugs.length > 0) {
                mod[f.dimField] = slugs;
            }
        }

        modules[relDir] = mod;
    }

    const prefixLabel = effectivePrefix ? `"${effectivePrefix} *"` : '(all)';
    console.log(`Найдено папок ${prefixLabel}: ${foundDirs.length}`);

    console.log(`Распознано модулей: ${Object.keys(modules).length}`);
    if (foundDirs.length === 0) {
        throw new Error(`Ни одной папки "${opts.modulePrefix} *" с index.md в ${docsRoot}`);
    }

    // --- dimToField ---
    const dimToField: Record<string, string | undefined> = {};
    for (const f of Object.values(loadFields(fieldsPath))) {
        if (f.dimension) dimToField[f.dimension] = f.dimField;
    }

    const unknown: UnknownDimSlug[] = [];
    for (const [modDir, mod] of Object.entries(modules)) {
        for (const [dimName, field] of Object.entries(dimToField)) {
            if (!registry.dimensions[dimName]) continue;
            const values: string[] = field && Array.isArray(mod[field]) ? (mod[field] as string[]) : [];
            for (const slug of values) {
                if (!registry.dimensions[dimName].items?.[slug]) {
                    unknown.push({ modDir, dim: dimName, slug });
                }
            }
        }
    }

    if (unknown.length > 0) {
        if (opts.lenient) {
            for (const u of unknown) {
                warnings.push(`${u.modDir}: ${u.dim}="${u.slug}" нет в реестре`);
            }
        } else {
            printUnknownError(unknown, registryPath);
            throw new Error(
                `Ошибка валидации каталога: ${unknown.length} неизвестных значений (детали — stderr)`,
            );
        }
    }

    if (opts.probe) {
        console.log(`\nPROBE: ничего не записано.`);
        return;
    }

    // --- index ---
    const index: Record<string, Record<string, string[]>> = {};
    for (const dimName of Object.keys(registry.dimensions)) {
        index[dimName] = {};
        for (const slug of Object.keys(registry.dimensions[dimName].items || {})) {
            index[dimName][slug] = [];
        }
    }
    for (const [modDir, mod] of Object.entries(modules)) {
        for (const [dimName, field] of Object.entries(dimToField)) {
            if (!index[dimName]) continue;
            const values: string[] = field && Array.isArray(mod[field]) ? (mod[field] as string[]) : [];
            for (const slug of values) {
                if (!index[dimName][slug]) index[dimName][slug] = [];
                if (!index[dimName][slug].includes(modDir)) index[dimName][slug].push(modDir);
            }
        }
    }

    // --- empty dimensions ---
    for (const [dimName, dim] of Object.entries(registry.dimensions)) {
        for (const slug of Object.keys(dim.items || {})) {
            if (!index[dimName][slug] || index[dimName][slug].length === 0) {
                warnings.push(`измерение ${dimName}/${slug}: нет модулей`);
            }
        }
    }

    // --- natural sort by id, fallback to dir ---
    for (const dimName of Object.keys(index)) {
        for (const slug of Object.keys(index[dimName])) {
            index[dimName][slug].sort((a, b) =>
                String_Compare_Natural.compare(modules[a]?.id || a, modules[b]?.id || b),
            );
        }
    }

    const catalog: CatalogFile = {
        generatedAt: new Date().toISOString(),
        docsRoot,
        lang: opts.lang,
        version: 1,
        registryPath,
        modules,
        dimensions: registry.dimensions,
        index,
        warnings,
    };

    for (const [dimName, dim] of Object.entries(registry.dimensions)) {
        const items = Object.keys(dim.items || {});
        const withModules = items.filter(s => (index[dimName][s] || []).length > 0).length;
        console.log(`  ${dimName}: ${items.length} (с модулями: ${withModules})`);
    }
    console.log(`Warnings: ${warnings.length}`);
    if (warnings.length) {
        const toShow = opts.verbose ? warnings : warnings.slice(0, 10);
        for (const w of toShow) console.log(`  ⚠ ${w}`);
        if (!opts.verbose && warnings.length > 10) {
            console.log(`  … и ещё ${warnings.length - 10}`);
        }
    }

    if (opts.dryRun) {
        console.log(`\nDRY-RUN: ${outPath} не записан`);
        return;
    }
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    console.log(`\n✅ Записан: ${outPath}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printUnknownError(unknown: UnknownDimSlug[], registryPath: string): void {
    const grouped: Record<string, { dim: string; slug: string; modules: string[] }> = {};
    for (const u of unknown) {
        const key = `${u.dim}.${u.slug}`;
        if (!grouped[key]) grouped[key] = { dim: u.dim, slug: u.slug, modules: [] };
        grouped[key].modules.push(u.modDir);
    }
    console.error(`\n❌ Ошибка валидации каталога: ${unknown.length} неизвестных значений\n`);
    for (const g of Object.values(grouped)) {
        console.error(`  ${g.dim}: "${g.slug}" — в ${g.modules.length} модул.`);
        console.error(`    например: ${g.modules[0]}`);
    }
    console.error(`\n📖 Как исправить:`);
    console.error(`  1. Откройте ${registryPath}`);
    console.error(`  2. В dimensions.<dim>.items добавьте недостающие slug-ключи`);
    console.error(`     с полями dir (путь к папке измерения) и title.`);
    console.error(`  3. Или исправьте значения в frontmatter модулей на существующие.`);
    console.error(`\n  Для отладки: --lenient — продолжит с предупреждениями.`);
}

function extractPathSlugs(
    relDir: string,
    pathCfg: PathConfig | undefined,
): string[] {
    if (!pathCfg) return [];

    // 1. Rules (словарь).
    if (Array.isArray(pathCfg.rules)) {
        const slugs: string[] = [];
        for (const rule of pathCfg.rules) {
            if (new RegExp(rule.regex).test(relDir)) {
                slugs.push(rule.slug);
            }
        }
        return slugs;
    }

    // 2. Simple: regex + template.
    if (pathCfg.regex && pathCfg.template) {
        const m = relDir.match(new RegExp(pathCfg.regex));
        if (!m) return [];
        let slug = pathCfg.template;
        for (let i = 1; i < m.length; i++) {
            slug = slug.replace(new RegExp(`\\$${i}`, 'g'), m[i] ?? '');
        }
        return [slug];
    }

    return [];
}