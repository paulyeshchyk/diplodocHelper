import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DOCS_DIR } from '../_paths.js';
import { runEmitFeatureMap } from './index.js';

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

    /** UI-строки (для подсветки label'ов strip'ов). */
    stripLabels: {
        actor: 'Actor',
        capability: 'Capability',
    } as const,
};

/**
 * Минимальный fixture catalog. Значения `docsRoot` не влияет на структуру
 * генерируемого md — только на префикс href'ов (считаем в тесте).
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
            actor: { items: {
                ci: { dir: 'A/CI', title: 'CI' },
                techwriter: { dir: 'A/TW', title: 'Techwriter' },
                reader: { dir: 'A/Reader', title: 'Reader' }, // в index[] пусто — должен быть отфильтрован
            } },
            capability: { items: {
                'cap-1': { dir: 'C/1', title: 'Cap1' },
                'cap-2': { dir: 'C/2', title: 'Cap2' },
            } },
            layer: { items: {
                cli: { dir: 'L/CLI', title: 'CLI' },
                ui:  { dir: 'L/UI',  title: 'UI' },
            } },
            family: { items: {
                'fam-a': { dir: 'F/A', title: 'FamA' },
                'fam-b': { dir: 'F/B', title: 'FamB' },
            } },
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

    // тот же расчёт префикса, что в index.js — не хардкодим,
    // чтобы тест не ломался на любой ОС
    docsRootRel = path.relative(DOCS_DIR, docsRoot).replace(/\\/g, '/');

    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
});

async function run(): Promise<string> {
    await runEmitFeatureMap([
        '--lang=ru',
        `--catalog=${catalogPath}`,
        `--out=${outPath}`,
    ]);
    return fs.readFileSync(outPath, 'utf8');
}

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
        // 'reader' есть в dimensions.actor.items, но index.actor.reader пуст
        const md = await run();
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
        // Alpha: layers=[cli], families=[fam-a]
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
        // МодульBeta.designation отсутствует → title=""
        const md = await run();
        expect(md).toContain('data-module="МодульBeta"');
        // title="" (не title="undefined")
        const betaChip = md.match(/<a class="fm-chip"[^>]*data-module="МодульBeta"[^>]*>/);
        expect(betaChip).not.toBeNull();
        expect(betaChip![0]).toMatch(/title=""/);
        expect(betaChip![0]).not.toContain('title="undefined"');
    });

    it('57.1#08 should render toolbar with counter and reset button', async () => {
        const md = await run();
        expect(md).toContain('<div class="fm-toolbar">');
        expect(md).toContain('<span class="fm-counter">Показано: —</span>');
        expect(md).toContain('<button type="button" class="fm-reset-all" disabled>Сбросить все</button>');
    });

    it('57.1#09 should put modules into the correct (family × layer) cell', async () => {
        const md = await run();
        // Alpha: fam-a × cli — должен быть в первой ячейке первой строки
        // Beta:  fam-b × ui  — во второй ячейке второй строки
        // Проверяем через regexp: рядом data-module="X" и пустые ячейки для другой оси
        expect(md).toMatch(/data-module="МодульAlpha"/);
        expect(md).toMatch(/data-module="МодульBeta"/);

        // FamA строка должна содержать Alpha-чип и пустую ячейку для UI
        const famARow = md.match(/<tr>(?:(?!<\/tr>)[\s\S])*data-value="fam-a"[\s\S]*?<\/tr>/);
        expect(famARow).not.toBeNull();
        expect(famARow![0]).toContain('data-module="МодульAlpha"');
        expect(famARow![0]).toContain('class="is-empty"');
    });
});

