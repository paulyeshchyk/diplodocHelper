import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DOCS_DIR } from '../_paths.js';
import { runEmitFeatureMap } from './index.ts';

/**
 * Тестовые константы. Вынесены в верх файла, чтобы при рефакторинге
 * FM-a..d (изменение пути, anchor, измерения, i18n) достаточно было
 * поправить только этот блок — тело тестов не меняется.
 */
const FM = {
    /** Якорь на карточке модуля в сгенерированной ссылке. */
    moduleAnchor: 'naznachenie',

    /** Измерения, которые рендерятся как полосы фильтров над сеткой. */
    stripDimensions: ['actor', 'capability'] as const,

    /** Измерение — строки сетки. */
    rowDimension: 'family' as const,

    /** Измерение — колонки сетки. */
    columnDimension: 'layer' as const,

    /** UI-строки (для проверки label'ов strip'ов). */
    stripLabels: {
        actor: 'Actor',
        capability: 'Capability',
    } as const,

    /** Плейсхолдер счётчика до инициализации клиента. */
    counterPlaceholder: 'Показано: —',

    /** Текст кнопки сброса. */
    resetButtonText: 'Сбросить все',
};

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/**
 * Минимальный fixture catalog. `docsRoot` влияет только на префикс href'ов —
 * в тесте пересчитывается относительно `DOCS_DIR` так же, как в генераторе.
 */
function makeFixture(docsRoot: string) {
    return {
        docsRoot,
        modules: {
            'МодульAlpha': {
                dir: 'МодульAlpha',
                id: '1',
                ident: 'alpha',
                actors: ['ci'],
                layers: ['cli'],
                families: ['fam-a'],
                capabilities: ['cap-1'],
                designation: 'Alpha desc',
            },
            'МодульBeta': {
                dir: 'МодульBeta',
                id: '2',
                ident: 'beta',
                actors: ['techwriter'],
                layers: ['ui'],
                families: ['fam-b'],
                capabilities: ['cap-2'],
                // designation намеренно отсутствует — проверяем escHtml(undefined) → ''
            },
        },
        dimensions: {
            actor: {
                items: {
                    ci: { dir: 'A/CI', title: 'CI' },
                    techwriter: { dir: 'A/TW', title: 'Techwriter' },
                    reader: { dir: 'A/Reader', title: 'Reader' }, // в index[] пусто — отфильтруется
                }
            },
            capability: {
                items: {
                    'cap-1': { dir: 'C/1', title: 'Cap1' },
                    'cap-2': { dir: 'C/2', title: 'Cap2' },
                }
            },
            layer: {
                items: {
                    cli: { dir: 'L/CLI', title: 'CLI' },
                    ui: { dir: 'L/UI', title: 'UI' },
                }
            },
            family: {
                items: {
                    'fam-a': { dir: 'F/A', title: 'FamA' },
                    'fam-b': { dir: 'F/B', title: 'FamB' },
                }
            },
        },
        index: {
            actor: {
                ci: ['МодульAlpha'],
                techwriter: ['МодульBeta'],
                reader: [], // пусто → pickUsable отфильтрует
            },
            capability: {
                'cap-1': ['МодульAlpha'],
                'cap-2': ['МодульBeta'],
            },
            layer: {
                cli: ['МодульAlpha'],
                ui: ['МодульBeta'],
            },
            family: {
                'fam-a': ['МодульAlpha'],
                'fam-b': ['МодульBeta'],
            },
        },
    };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let root: string;
let catalogPath: string;
let outPath: string;
let docsRoot: string;
let docsRootRel: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-generator-'));
    docsRoot = path.join(root, 'docs', 'ru', 'Модули');
    catalogPath = path.join(root, 'catalog.json');
    outPath = path.join(root, 'feature-map.md');

    fs.writeFileSync(catalogPath, JSON.stringify(makeFixture(docsRoot)), 'utf8');

    // тот же расчёт префикса, что в index.ts — не хардкодим,
    // чтобы тест не ломался на любой ОС
    docsRootRel = path.relative(DOCS_DIR, docsRoot).replace(/\\/g, '/');

    jest.spyOn(console, 'log').mockImplementation(() => { });
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
});

/**
 * Запускает генератор на fixture-каталоге, читает сгенерированный `.md`.
 */
async function run(): Promise<string> {
    await runEmitFeatureMap([
        '--lang=ru',
        `--catalog=${catalogPath}`,
        `--out=${outPath}`,
    ]);
    return fs.readFileSync(outPath, 'utf8');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('feature-map.runEmitFeatureMap', () => {
    it('57.1#01 should emit frontmatter and # heading', async () => {
        const md = await run();

        expect(md).toContain('---\ntitle: Feature Map\nsectionType: Page\n---');
        expect(md).toContain('# Feature Map');
    });

    it('57.1#02 should wrap content in <div data-feature-map>', async () => {
        const md = await run();

        expect(md).toContain('<div data-feature-map>');
        expect(md).toContain('</div>');
    });

    it('57.1#03 should render every configured strip dimension', async () => {
        const md = await run();

        for (const dim of FM.stripDimensions) {
            expect(md).toContain(`data-strip="${dim}"`);
            expect(md).toContain(`<span class="fm-strip-label">${FM.stripLabels[dim]}</span>`);
        }
    });

    it('57.1#04 should skip dimensions with no modules in index (pickUsable)', async () => {
        const md = await run();

        // 'reader' есть в dimensions.actor.items, но index.actor.reader пуст
        expect(md).not.toContain('data-value="reader"');
        expect(md).not.toContain('Reader');
    });

    it('57.1#05 should render <thead> from column dimension and <tbody> rows from row dimension', async () => {
        const md = await run();

        // <thead>: каждый layer как кнопка-заголовок
        expect(md).toContain(`data-strip="${FM.columnDimension}" data-value="cli"`);
        expect(md).toContain(`data-strip="${FM.columnDimension}" data-value="ui"`);

        // <tbody>: каждая family — как кнопка-заголовок строки
        expect(md).toContain(`data-strip="${FM.rowDimension}" data-value="fam-a"`);
        expect(md).toContain(`data-strip="${FM.rowDimension}" data-value="fam-b"`);
    });

    it('57.1#06 should embed module chip with correct href and data-attributes', async () => {
        const md = await run();

        const alphaHref = `/${docsRootRel}/МодульAlpha/index.html#${FM.moduleAnchor}`;
        expect(md).toContain(`class="fm-chip" href="${encodeURI(alphaHref)}"`);
        expect(md).toContain('data-module="МодульAlpha"');
        expect(md).toContain('data-actor="ci"');
        expect(md).toContain('data-cap="cap-1"');
        expect(md).toContain('data-family="fam-a"');
        expect(md).toContain('data-layer="cli"');

        // Beta
        expect(md).toContain('data-module="МодульBeta"');
        expect(md).toContain('data-actor="techwriter"');
    });

    it('57.1#07 should escape HTML-sensitive chars but collapse undefined to ""', async () => {
        const md = await run();

        // МодульBeta.designation отсутствует → title=""
        const betaChip = md.match(/<a class="fm-chip"[^>]*data-module="МодульBeta"[^>]*>/);
        expect(betaChip).not.toBeNull();
        expect(betaChip![0]).toMatch(/title=""/);
        expect(betaChip![0]).not.toContain('title="undefined"');
    });

    it('57.1#08 should render toolbar with counter and reset button', async () => {
        const md = await run();

        expect(md).toContain('<div class="fm-toolbar">');
        expect(md).toContain(`<span class="fm-counter">${FM.counterPlaceholder}</span>`);
        expect(md).toContain(
            `<button type="button" class="fm-reset-all" disabled>${FM.resetButtonText}</button>`,
        );
    });

    it('57.1#09 should put modules into the correct (family × layer) cell', async () => {
        const md = await run();

        // Alpha: fam-a × cli — чип в fam-a-строке
        const famARow = md.match(/<tr>(?:(?!<\/tr>)[\s\S])*data-value="fam-a"[\s\S]*?<\/tr>/);
        expect(famARow).not.toBeNull();
        expect(famARow![0]).toContain('data-module="МодульAlpha"');
        expect(famARow![0]).toContain('class="is-empty"');
    });
});

describe('feature-map.runEmitFeatureMap — alt-project (57.4)', () => {
    // Абсолютные пути к fixture-файлам (не зависят от cwd)
    const fixtureDir = path.join(__dirname, '__fixtures__', 'alt-project');
    const altCatalogPath = path.join(fixtureDir, 'catalog.alt.json');
    const altConfigPath = path.join(fixtureDir, 'config.alt.json');

    async function runAlt(): Promise<string> {
        await runEmitFeatureMap([
            '--lang=en',
            `--catalog=${altCatalogPath}`,
            `--config=${altConfigPath}`,
            `--out=${outPath}`,
        ]);
        return fs.readFileSync(outPath, 'utf8');
    }

    it('57.4#01 should use title and sectionType from alt-config', async () => {
        const md = await runAlt();
        expect(md).toContain('---\ntitle: Guidelines Map\nsectionType: Article\n---');
        expect(md).toContain('# Guidelines Map');
        // не должно быть дефолтного заголовка
        expect(md).not.toContain('title: Feature Map');
    });

    it('57.4#02 should render only stripDimensions from alt-config (audience, not actor)', async () => {
        const md = await runAlt();
        expect(md).toContain('data-strip="audience"');
        expect(md).toContain('<span class="fm-strip-label">Audience</span>');
        // дефолтные strip-измерения не должны рендериться
        expect(md).not.toMatch(/class="fm-strip"\s+data-strip="actor"/);
        expect(md).not.toMatch(/class="fm-strip"\s+data-strip="capability"/);
    });

    it('57.4#03 should use row/column dimensions from alt-config (topic × stage)', async () => {
        const md = await runAlt();
        // столбцы = stage
        expect(md).toContain('data-strip="stage" data-value="draft"');
        expect(md).toContain('data-strip="stage" data-value="published"');
        // строки = topic
        expect(md).toContain('data-strip="topic" data-value="intro"');
        expect(md).toContain('data-strip="topic" data-value="reference"');
        // старые измерения не должны рендериться как заголовки
        expect(md).not.toContain('data-strip="layer"');
        expect(md).not.toContain('data-strip="family"');
    });

    it('57.4#04 should use moduleHrefAnchor from alt-config (purpose)', async () => {
        const md = await runAlt();
        expect(md).toContain('#purpose"');
        expect(md).not.toContain('#naznachenie"');
    });

    it('57.4#05 should use i18n from alt-config (counter, reset)', async () => {
        const md = await runAlt();
        expect(md).toContain('<span class="fm-counter">Showing: —</span>');
        expect(md).toContain('<button type="button" class="fm-reset-all" disabled>Reset</button>');
        expect(md).not.toContain('Показано: —');
    });

    it('57.4#06 should use emptyCellSymbol from alt-config (em-dash instead of middle dot)', async () => {
        const md = await runAlt();
        // grid 2×2, но modules только (beginner,intro,draft) и (advanced,reference,published)
        // — ячейки (beginner,reference), (advanced,intro) и т.д. пустые
        expect(md).toContain('<td class="is-empty"><div class="fm-cell-content">—</div></td>');
        expect(md).not.toContain('<div class="fm-cell-content">·</div>');
    });

    it('57.4#07 should place modules into (topic × stage) cells per dimToFieldMap', async () => {
        const md = await runAlt();
        // ManualA: topics=[intro], stages=[draft] → ячейка (draft, intro)
        // ManualB: topics=[reference], stages=[published] → ячейка (published, reference)
        // Проверяем, что оба чипа есть
        expect(md).toContain('data-module="ManualA"');
        expect(md).toContain('data-module="ManualB"');
    });

    it('57.4#08 should default-config still work without --config (regression)', async () => {
        // Тот же fixture, но без --config: default не знает про audiences/topics/stages,
        // поэтому grid пустая (row=family, col=layer — у модулей нет этих полей),
        // но структура должна сгенерироваться без ошибок.
        await runEmitFeatureMap([
            '--lang=ru',
            `--catalog=${altCatalogPath}`,
            `--out=${outPath}`,
        ]);
        const md = fs.readFileSync(outPath, 'utf8');
        expect(md).toContain('title: Feature Map');
        expect(md).toContain('data-strip="actor"');
        expect(md).toContain('data-strip="capability"');
    });

    it('57.4#09 should warn on unknown config key and still merge known ones', async () => {
        const badConfigPath = path.join(root, 'bad-config.json');
        fs.writeFileSync(
            badConfigPath,
            JSON.stringify({ title: 'Bad Title', unknownOption: 'whatever' }),
            'utf8',
        );

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        await runEmitFeatureMap([
            '--lang=ru',
            `--catalog=${altCatalogPath}`,
            `--config=${badConfigPath}`,
            `--out=${outPath}`,
        ]);
        const md = fs.readFileSync(outPath, 'utf8');

        expect(md).toContain('title: Bad Title');
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('unknown config key "unknownOption"'),
        );
    });
});

describe('feature-map.runEmitFeatureMap — path overrides (57.5)', () => {
    it('57.5#01 should write to custom docsDir when passed via opts', async () => {
        const customDocs = path.join(root, 'custom-docs');
        fs.mkdirSync(customDocs, { recursive: true });

        await runEmitFeatureMap(
            ['--lang=ru', `--catalog=${catalogPath}`],
            { docsDir: customDocs },
        );

        const expectedPath = path.join(
            customDocs,
            'ru/Модули/FM/feature-map.md',
        );
        expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('57.5#02 should read catalog from custom generatedDir when no --catalog', async () => {
        const customGen = path.join(root, 'custom-gen');
        fs.mkdirSync(customGen, { recursive: true });
        const customCatalog = path.join(customGen, 'catalog.ru.json');
        fs.writeFileSync(customCatalog, JSON.stringify(makeFixture(docsRoot)), 'utf8');

        await runEmitFeatureMap(
            ['--lang=ru', `--out=${outPath}`],
            { generatedDir: customGen },
        );

        expect(fs.existsSync(outPath)).toBe(true);
        const md = fs.readFileSync(outPath, 'utf8');
        expect(md).toContain('title: Feature Map');
    });

    it('57.5#03 should compute docsRootRel relative to custom docsDir', async () => {
        const customDocs = path.join(root, 'custom-docs');
        fs.mkdirSync(customDocs, { recursive: true });

        await runEmitFeatureMap(
            ['--lang=ru', `--catalog=${catalogPath}`],
            { docsDir: customDocs },
        );

        const expectedPath = path.join(customDocs, 'ru/Модули/FM/feature-map.md');
        const md = fs.readFileSync(expectedPath, 'utf8');

        // customDocs = root/custom-docs, docsRoot = root/docs/ru/Модули
        // → docsRootRel = '../docs/ru/Модули'
        const expectedRel = path.relative(customDocs, docsRoot).replace(/\\/g, '/');
        // href модуля percent-encoded через encodeURI() в index.ts — учитываем.
        const expectedHref = `/${expectedRel}/МодульAlpha/index.html#naznachenie`;
        expect(md).toContain(encodeURI(expectedHref));
    });
});