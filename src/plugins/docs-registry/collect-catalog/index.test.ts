import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
    runCollectCatalog,
    parseArgv,
    parseListValue,
} = require('./index.ts');

// ---------------------------------------------------------------------------
// Общие fixtures (вне describe — доступны всем)
// ---------------------------------------------------------------------------

let root: string;
let docsDir: string;
let registryDir: string;
let generatedDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-catalog-'));
    docsDir = path.join(root, 'docs');
    registryDir = path.join(root, '_registry');
    generatedDir = path.join(root, '_generated');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.mkdirSync(registryDir, { recursive: true });
    fs.mkdirSync(generatedDir, { recursive: true });

    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
});

/** Пишет модуль в `<docsDir>/ru/Модули/<relPath>/index.md`. */
function writeModule(relPath: string, frontmatter: string): void {
    const full = path.join(docsDir, 'ru', 'Модули', relPath, 'index.md');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `---\n${frontmatter}\n---\n\nbody`, 'utf8');
}

/** Пишет «буклет» (no-prefix проект) в `<docsDir>/ru/booklets/<relPath>/index.md`. */
function writeBooklet(relPath: string, frontmatter: string): void {
    const full = path.join(docsDir, 'ru', 'booklets', relPath, 'index.md');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `---\n${frontmatter}\n---\n\nbody`, 'utf8');
}

/** Пишет страницу измерения (без frontmatter-полей — только title). */
function writeDimension(relPath: string): void {
    const full = path.join(docsDir, 'ru', 'booklets', relPath, 'index.md');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, '---\ntitle: Dim\n---\n', 'utf8');
}

/** Пишет `dimensions.yaml` в `registryDir`. */
function writeRegistry(yaml: string): void {
    fs.writeFileSync(path.join(registryDir, 'dimensions.yaml'), yaml, 'utf8');
}

// ---------------------------------------------------------------------------
// Unit: parseArgv
// ---------------------------------------------------------------------------

describe('collect-catalog.parseArgv', () => {
    it('57.6#01 should provide defaults for empty argv', () => {
        expect(parseArgv([])).toMatchObject({
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
        });
    });

    it('57.6#02 should parse --key=value form', () => {
        const r = parseArgv(['--lang=en', '--docs-root=/x', '--module-prefix=Module_']);
        expect(r.lang).toBe('en');
        expect(r.docsRoot).toBe('/x');
        expect(r.modulePrefix).toBe('Module_');
    });

    it('57.6#03 should parse --key value form', () => {
        const r = parseArgv(['--lang', 'en', '--registry', '/path']);
        expect(r.lang).toBe('en');
        expect(r.registry).toBe('/path');
    });

    it('57.6#04 should parse boolean flags', () => {
        const r = parseArgv(['--lenient', '--probe', '--dry-run', '--verbose']);
        expect(r).toMatchObject({
            lenient: true,
            probe: true,
            dryRun: true,
            verbose: true,
        });
    });

    it('57.6#05 should treat first positional as docsRoot', () => {
        expect(parseArgv(['./some/path']).docsRoot).toBe('./some/path');
    });
});

// ---------------------------------------------------------------------------
// Unit: parseListValue
// ---------------------------------------------------------------------------

describe('collect-catalog.parseListValue', () => {
    it('57.6#10 should return [] for null/undefined', () => {
        expect(parseListValue(null)).toEqual([]);
        expect(parseListValue(undefined)).toEqual([]);
    });

    it('57.6#11 should trim and filter array elements', () => {
        expect(parseListValue([' a ', '', ' b'])).toEqual(['a', 'b']);
    });

    it('57.6#12 should split comma-separated string', () => {
        expect(parseListValue('a,b,c')).toEqual(['a', 'b', 'c']);
        expect(parseListValue('a, b , c ')).toEqual(['a', 'b', 'c']);
    });

    it('57.6#13 should return [] for empty string', () => {
        expect(parseListValue('')).toEqual([]);
        expect(parseListValue('   ')).toEqual([]);
    });

    it('57.6#14 should coerce non-string scalar to string', () => {
        expect(parseListValue(42)).toEqual(['42']);
    });
});

// ---------------------------------------------------------------------------
// Integration: runCollectCatalog (default project, prefix=Модуль)
// ---------------------------------------------------------------------------

describe('collect-catalog.runCollectCatalog (integration)', () => {
    it('57.6#21 should collect modules by prefix and skip non-matching dirs', async () => {
        writeModule('МодульA', 'title: A\nid: 1\nident: alpha');
        writeModule('МодульB', 'title: B\nid: 2\nident: beta');
        writeModule('NotAModule', 'title: N\nid: 99');
        writeModule('_generated', 'title: G\nid: 98');

        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            ['--lang=ru', `--out=${outPath}`],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        const moduleDirs = Object.keys(catalog.modules).sort();
        expect(moduleDirs).toEqual(['МодульA', 'МодульB']);
        expect(catalog.modules['МодульA'].dir).toBe('МодульA');
        expect(catalog.modules['МодульA'].path).toBe('МодульA/index.md');
    });

    it('57.6#22 should write to default output path when --out not provided', async () => {
        writeModule('МодульA', 'title: A\nid: 1');
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);

        await runCollectCatalog(
            ['--lang=ru'],
            { docsDir, registryDir, generatedDir },
        );

        const defaultPath = path.join(generatedDir, 'catalog.ru.json');
        expect(fs.existsSync(defaultPath)).toBe(true);
    });

    it('57.6#23 should throw when docsRoot exists but has no module dirs', async () => {
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);
        fs.mkdirSync(path.join(docsDir, 'ru', 'Модули'), { recursive: true });

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await expect(
            runCollectCatalog(
                ['--lang=ru', `--out=${outPath}`],
                { docsDir, registryDir, generatedDir },
            ),
        ).rejects.toThrow(/Ни одной папки/);
    });

    it('57.6#24 should throw when docsRoot does not exist', async () => {
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);
        const missingRoot = path.join(root, '__no_such_dir__');

        await expect(
            runCollectCatalog(
                ['--lang=ru', `--docs-root=${missingRoot}`, `--out=${path.join(generatedDir, 'x.json')}`],
                { docsDir, registryDir, generatedDir },
            ),
        ).rejects.toThrow(/docsRoot/i);
    });

    it('57.6#25 should reject unknown dimension slug with clear error', async () => {
        fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });
        fs.writeFileSync(
            path.join(docsDir, '_registry', 'fields.yaml'),
            `fields:\n  actor:\n    kind: multi\n    dimension: actor\n    dimField: actors\n    frontmatterKey: actor\n`,
            'utf8',
        );

        writeRegistry(`dimensions:\n  actor:\n    items:\n      ci: { dir: A/CI, title: CI }\n`);
        writeModule('МодульA', 'title: A\nid: 1\nactor: unknown_actor');

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await expect(
            runCollectCatalog(
                ['--lang=ru', `--out=${outPath}`],
                { docsDir, registryDir, generatedDir },
            ),
        ).rejects.toThrow();
    });

    it('57.6#26 should sort index entries by id with fallback to dir', async () => {
        fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });
        fs.writeFileSync(
            path.join(docsDir, '_registry', 'fields.yaml'),
            `fields:\n  actor:\n    kind: multi\n    dimension: actor\n    dimField: actors\n    frontmatterKey: actor\n`,
            'utf8',
        );
        writeRegistry(`dimensions:\n  actor:\n    items:\n      ci: { dir: A/CI, title: CI }\n`);

        writeModule('МодульB', 'title: B\nid: 2\nactor: ci');
        writeModule('МодульA', 'title: A\nid: 10\nactor: ci');
        writeModule('МодульC', 'title: C\nactor: ci');

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            ['--lang=ru', `--out=${outPath}`],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        expect(catalog.index.actor.ci).toEqual(['МодульB', 'МодульA', 'МодульC']);
    });
});

// ---------------------------------------------------------------------------
// Integration: runCollectCatalog — no-prefix project (57.6#27..#28)
// ---------------------------------------------------------------------------

describe('collect-catalog.runCollectCatalog — no-prefix project', () => {
    it('57.6#27 should walk all dirs with index.md when --module-prefix=""', async () => {
        writeBooklet('iPhone15Pro', 'title: iPhone 15 Pro\nid: 1');
        writeBooklet('GalaxyS24', 'title: Galaxy S24\nid: 2');
        writeDimension('Manufacturers/Apple');

        fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });
        fs.writeFileSync(path.join(docsDir, '_registry', 'fields.yaml'), '', 'utf8');
        writeRegistry(
            `dimensions:\n  manufacturer:\n    items:\n      apple: { dir: "Manufacturers/Apple", title: "Apple" }\n`,
        );

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            [
                '--lang=ru',
                '--module-prefix=',
                `--docs-root=${path.join(docsDir, 'ru', 'booklets')}`,
                `--out=${outPath}`,
            ],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        const moduleDirs = Object.keys(catalog.modules).sort();
        expect(moduleDirs).toEqual(['GalaxyS24', 'iPhone15Pro']);
        expect(moduleDirs).not.toContain('Manufacturers/Apple');
    });

    it('57.6#28 should still use prefix when --module-prefix=Модуль (default)', async () => {
        writeModule('МодульA', 'title: A\nid: 1');
        writeModule('NotAModule', 'title: N\nid: 99');
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            ['--lang=ru', `--out=${outPath}`],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        expect(Object.keys(catalog.modules)).toEqual(['МодульA']);
    });
});

describe('collect-catalog — layout.json integration', () => {
    it('57.6#29 should default to diplodoc-helper layout (no layout.json)', async () => {
        // регрессия: без layout.json — дефолт (Модули/Модуль)
        writeModule('МодульA', 'title: A\nid: 1');
        writeModule('NotAModule', 'title: N\nid: 99');
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            ['--lang=ru', `--out=${outPath}`],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        expect(Object.keys(catalog.modules)).toEqual(['МодульA']);
    });

    it('57.6#30 should respect layout.modulesFolder and layout.modulePrefix', async () => {
        // Модули переехали в booklets/, с префиксом Phone_
        const bookletsDir = path.join(docsDir, 'ru', 'booklets');
        const fn = (p: string, fm: string) => {
            const full = path.join(bookletsDir, p, 'index.md');
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, `---\n${fm}\n---\n\nbody`, 'utf8');
        };
        fn('Phone_iPhone15', 'title: iPhone 15\nid: 1');
        fn('Phone_GalaxyS24', 'title: Galaxy S24\nid: 2');
        fn('Other', 'title: Other\nid: 99');

        fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });
        fs.writeFileSync(
            path.join(docsDir, '_registry', 'layout.json'),
            JSON.stringify({ modulesFolder: 'booklets', modulePrefix: 'Phone_' }),
            'utf8',
        );
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            ['--lang=ru', `--out=${outPath}`],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        const moduleDirs = Object.keys(catalog.modules).sort();
        expect(moduleDirs).toEqual(['Phone_GalaxyS24', 'Phone_iPhone15']);
    });

    it('57.6#31 should filter by layout.moduleSectionTypes', async () => {
        // Иерархия: Часть (Part) → Раздел (Section) → Статья (Page)
        const hierarchy = path.join(docsDir, 'ru');
        const fn = (rel: string, fm: string) => {
            const full = path.join(hierarchy, rel, 'index.md');
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, `---\n${fm}\n---\n\nbody`, 'utf8');
        };
        fn('Часть1', 'title: Part 1\nsectionType: Part\nid: 1');
        fn('Часть1/Раздел1', 'title: Section 1\nsectionType: Section\nid: 2');
        fn('Часть1/Раздел1/Глава1', 'title: Chapter 1\nsectionType: Chapter\nid: 3');
        fn('Часть1/Раздел1/Глава1/Статья1', 'title: Art 1\nsectionType: Page\nid: 4');

        fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });
        fs.writeFileSync(
            path.join(docsDir, '_registry', 'layout.json'),
            JSON.stringify({
                modulesFolder: null,
                modulePrefix: null,
                moduleSectionTypes: ['Page'],
            }),
            'utf8',
        );
        writeRegistry(`dimensions:\n  actor:\n    items: {}\n`);

        const outPath = path.join(generatedDir, 'catalog.ru.json');
        await runCollectCatalog(
            ['--lang=ru', `--out=${outPath}`],
            { docsDir, registryDir, generatedDir },
        );

        const catalog = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        const moduleDirs = Object.keys(catalog.modules);
        expect(moduleDirs).toEqual(['Часть1/Раздел1/Глава1/Статья1']);
    });
});