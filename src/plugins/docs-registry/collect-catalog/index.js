#!/usr/bin/env node
// @ts-nocheck

'use strict';

require('../_paths.js');

const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const { DOCS_DIR, REGISTRY_DIR, GENERATED_DIR } = require('../_paths.js');

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

function parseArgv(argv) {
    const opts = {
        lang: 'ru',
        docsRoot: null,
        registry: null,
        out: null,
        modulePrefix: 'Модуль',
        lenient: false,
        probe: false,
        dryRun: false,
        verbose: false,
        help: false,
    };
    const positional = [];
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

function toPosix(p) {
    return p.split(path.sep).join('/');
}

function splitFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return null;
    return { frontmatter: m[1], body: m[2] };
}

function parseListValue(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
    const s = String(v).trim();
    if (!s) return [];
    return s
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);
}

function naturalCompare(a, b) {
    const re = /(\d+)|(\D+)/g;
    const ax = String(a).match(re) || [];
    const bx = String(b).match(re) || [];
    const n = Math.max(ax.length, bx.length);
    for (let i = 0; i < n; i++) {
        const x = ax[i] || '';
        const y = bx[i] || '';
        const nx = /^\d+$/.test(x) ? parseInt(x, 10) : null;
        const ny = /^\d+$/.test(y) ? parseInt(y, 10) : null;
        if (nx !== null && ny !== null) {
            if (nx !== ny) return nx - ny;
        } else {
            if (x < y) return -1;
            if (x > y) return 1;
        }
    }
    return 0;
}

function matchModuleDir(name, prefix) {
    const n = name.trim();
    if (!n.startsWith(prefix)) return false;
    const after = n.slice(prefix.length);
    if (after === '') return true;
    return /^[A-ZА-ЯЁ0-9 _\-.]/.test(after);
}

const SKIP_DIRS = new Set(['node_modules', '.git', '_generated', '_includes', '_registry']);

async function walkModules(rootDir, modulePrefix, onModule) {
    const found = [];
    const walk = async dir => {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const e of entries) {
            if (!e.isDirectory()) continue;
            if (SKIP_DIRS.has(e.name)) continue;
            const full = path.join(dir, e.name);
            if (matchModuleDir(e.name, modulePrefix)) {
                const idx = path.join(full, 'index.md');
                try {
                    await fs.access(idx);
                    found.push(full);
                    await onModule(full, idx);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error('[collect-catalog] walk:' + msg);
                }
            }
            await walk(full);
        }
    };
    await walk(rootDir);
    return found;
}

async function resolveRegistryPath(lang, explicit) {
    if (explicit) return path.resolve(explicit);
    const candidates = [path.join(REGISTRY_DIR, lang + '.yaml'), path.join(REGISTRY_DIR, 'dimensions.yaml')];
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

function printUnknownError(unknown, registryPath) {
    const grouped = {};
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

async function runCollectCatalog(argv) {
    const opts = parseArgv(argv);
    if (opts.help) {
        console.log(HELP);
        return;
    }

    const docsRoot = opts.docsRoot ? path.resolve(opts.docsRoot) : path.join(DOCS_DIR, opts.lang, 'Модули');
    const registryPath = await resolveRegistryPath(opts.lang, opts.registry);
    const outPath = opts.out ? path.resolve(opts.out) : path.join(GENERATED_DIR, `catalog.${opts.lang}.json`);

    console.log('=== collect-catalog ===');
    console.log(`docsRoot: ${docsRoot}`);
    console.log(`registry: ${registryPath}`);
    console.log(`out:      ${outPath}`);
    console.log('');

    try {
        const st = await fs.stat(docsRoot);
        if (!st.isDirectory()) throw 0;
    } catch {
        console.error(`❌ docsRoot не существует или не каталог: ${docsRoot}`);
        process.exit(1);
    }

    let registry;
    try {
        registry = yaml.load(await fs.readFile(registryPath, 'utf8'));
    } catch (e) {
        console.error(`❌ Не удалось прочитать реестр: ${e.message}`);
        process.exit(1);
    }
    if (!registry || !registry.dimensions) {
        console.error(`❌ Реестр ${registryPath} не содержит .dimensions`);
        process.exit(1);
    }

    const modules = {};
    const warnings = [];
    const foundDirs = await walkModules(docsRoot, opts.modulePrefix, async (dir, filePath) => {
        const raw = await fs.readFile(filePath, 'utf8');
        const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
        const parts = splitFrontmatter(content);
        const relFile = toPosix(path.relative(docsRoot, filePath));
        if (!parts) {
            warnings.push(`${relFile}: нет frontmatter`);
            return;
        }
        let fm;
        try {
            fm = yaml.load(parts.frontmatter) || {};
        } catch (e) {
            warnings.push(`${relFile}: невалидный YAML: ${e.message}`);
            return;
        }
        if (typeof fm !== 'object' || Array.isArray(fm)) {
            warnings.push(`${relFile}: frontmatter не объект`);
            return;
        }

        const relDir = toPosix(path.relative(docsRoot, dir));
        modules[relDir] = {
            dir: relDir,
            path: relDir + '/index.md',
            id: fm.ID != null ? String(fm.ID) : '',
            ident: fm['Идентификатор'] != null ? String(fm['Идентификатор']) : '',
            title: fm.title || '',
            pureTitle: fm.pureTitle || '',
            designation: fm.designation || '',
            role: fm.role || '',
            folder: fm.folder != null ? String(fm.folder) : '', // NEW
            entrypoint: fm.entrypoint != null ? String(fm.entrypoint) : '', // NEW
            version: fm.version != null ? String(fm.version) : '', // NEW
            families: parseListValue(fm.family),
            layers: parseListValue(fm.layer),
            capabilities: parseListValue(fm.capability),
        };
    });

    console.log(`Найдено папок "${opts.modulePrefix} *": ${foundDirs.length}`);
    console.log(`Распознано модулей: ${Object.keys(modules).length}`);
    if (foundDirs.length === 0) {
        console.error(`\n❌ Ни одной папки "${opts.modulePrefix} *" с index.md в ${docsRoot}`);
        process.exit(1);
    }

    // Строгая проверка: все slug в модулях должны быть в реестре
    const dimToField = { family: 'families', layer: 'layers', capability: 'capabilities' };
    const unknown = [];
    for (const [modDir, mod] of Object.entries(modules)) {
        for (const [dimName, field] of Object.entries(dimToField)) {
            if (!registry.dimensions[dimName]) continue;
            for (const slug of mod[field] || []) {
                if (!registry.dimensions[dimName].items?.[slug]) {
                    unknown.push({ modDir, dim: dimName, slug });
                }
            }
        }
    }

    if (unknown.length > 0) {
        if (opts.lenient) {
            for (const u of unknown) warnings.push(`${u.modDir}: ${u.dim}="${u.slug}" нет в реестре`);
        } else {
            printUnknownError(unknown, registryPath);
            process.exit(1);
        }
    }

    if (opts.probe) {
        console.log(`\nPROBE: ничего не записано.`);
        return;
    }

    // Индекс
    const index = {};
    for (const dimName of Object.keys(registry.dimensions)) {
        index[dimName] = {};
        for (const slug of Object.keys(registry.dimensions[dimName].items || {})) {
            index[dimName][slug] = [];
        }
    }
    for (const [modDir, mod] of Object.entries(modules)) {
        for (const [dimName, field] of Object.entries(dimToField)) {
            if (!index[dimName]) continue;
            for (const slug of mod[field] || []) {
                if (!index[dimName][slug]) index[dimName][slug] = [];
                if (!index[dimName][slug].includes(modDir)) index[dimName][slug].push(modDir);
            }
        }
    }

    // Проверка dir из реестра
    for (const [dimName, dim] of Object.entries(registry.dimensions)) {
        for (const [slug, item] of Object.entries(dim.items || {})) {
            try {
                await fs.access(path.join(docsRoot, item.dir));
            } catch {
                warnings.push(`${dimName}/${slug}: папка не существует: ${item.dir}`);
            }
        }
    }

    // Пустые
    for (const [dimName, dim] of Object.entries(registry.dimensions)) {
        for (const slug of Object.keys(dim.items || {})) {
            if (!index[dimName][slug] || index[dimName][slug].length === 0) {
                warnings.push(`измерение ${dimName}/${slug}: нет модулей`);
            }
        }
    }

    // Natural sort
    for (const dimName of Object.keys(index)) {
        for (const slug of Object.keys(index[dimName])) {
            index[dimName][slug].sort((a, b) => naturalCompare(modules[a]?.id || '', modules[b]?.id || ''));
        }
    }

    const catalog = {
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
        if (!opts.verbose && warnings.length > 10) console.log(`  … и ещё ${warnings.length - 10}`);
    }

    if (opts.dryRun) {
        console.log(`\nDRY-RUN: ${outPath} не записан`);
        return;
    }
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    console.log(`\n✅ Записан: ${outPath}`);
}

if (require.main === module) {
    runCollectCatalog(process.argv.slice(2)).catch(e => {
        console.error(e.message || e);
        process.exit(1);
    });
}

module.exports = { runCollectCatalog };
