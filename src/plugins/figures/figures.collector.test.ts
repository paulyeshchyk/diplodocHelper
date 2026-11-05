import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { walkMdFilesGetFigures } from './figures.collector';
import type { FigureList } from './figures.types';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'figures-collector-'));
    langDir = path.join(root, 'ru');
    fs.mkdirSync(langDir, { recursive: true });
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

function writeMd(relPath: string, body: string): void {
    const full = path.join(langDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, 'utf8');
}

/** Фикстура: один рисунок с локальной картинкой и распознаваемым номером. */
const FIGURE_BLOCK = [
    '![Alt text](./image.png)',
    '',
    '<figcaption class="imageDescription" id="fig-test">Рисунок 1. Caption</figcaption>',
].join('\n');

describe('figures.collector.walkMdFilesGetFigures (+7)', () => {
    it('00.4.2#45 (+7) should collect figures from regular .md', () => {
        writeMd('page.md', `---\ntitle: Page\n---\n\n${FIGURE_BLOCK}`);
        const figures: FigureList = walkMdFilesGetFigures(langDir);
        expect(figures).toHaveLength(1);
        expect(figures[0].id).toBe('fig-test');
        expect(figures[0].sourcePath).toBe('page.md');
        expect(figures[0].imagePath).toBe('./image.png');
        expect(figures[0].imageAlt).toBe('Alt text');
        expect(figures[0].figureNumber).toBe(1);
    });

    it('00.4.2#46 (+7) should skip own output dir (figures)', () => {
        writeMd('figures/index.md', `---\ntitle: I\n---\n\n${FIGURE_BLOCK}`);
        writeMd('page.md', `---\ntitle: Page\n---\n\n${FIGURE_BLOCK}`);
        const figures = walkMdFilesGetFigures(langDir);
        // только page.md, output-dir исключён
        expect(figures).toHaveLength(1);
        expect(figures[0].sourcePath).toBe('page.md');
    });

    it('00.4.2#47 (+7) should skip sibling contexts and helptags dirs', () => {
        writeMd('contexts/index.md', `---\ntitle: C\n---\n\n${FIGURE_BLOCK}`);
        writeMd('helptags/index.md', `---\ntitle: H\n---\n\n${FIGURE_BLOCK}`);
        const figures = walkMdFilesGetFigures(langDir);
        expect(figures).toHaveLength(0);
    });

    it('00.4.2#48 (+7) should walk into .hidden dirs (skipHidden: false)', () => {
        writeMd('.hidden/page.md', `---\ntitle: H\n---\n\n${FIGURE_BLOCK}`);
        const figures = walkMdFilesGetFigures(langDir);
        expect(figures).toHaveLength(1);
        expect(figures[0].sourcePath).toBe('.hidden/page.md');
    });

    it('00.4.2#49 (+7) should walk into _underscore dirs (skipUnderscore: false)', () => {
        writeMd('_assets/page.md', `---\ntitle: A\n---\n\n${FIGURE_BLOCK}`);
        const figures = walkMdFilesGetFigures(langDir);
        expect(figures).toHaveLength(1);
        expect(figures[0].sourcePath).toBe('_assets/page.md');
    });

    it('00.4.2#50 (+7) should walk into abbrs/terms/roadmap (NOT in SKIP_DIRS)', () => {
        for (const dir of ['abbrs', 'terms', 'roadmap']) {
            writeMd(`${dir}/page.md`, `---\ntitle: ${dir}\n---\n\n${FIGURE_BLOCK}`);
        }
        const figures = walkMdFilesGetFigures(langDir);
        expect(figures).toHaveLength(3);
        const paths = figures.map(f => f.sourcePath).sort();
        expect(paths).toEqual(['abbrs/page.md', 'roadmap/page.md', 'terms/page.md']);
    });

    it('00.4.2#51 (+7) should aggregate across nested dirs and not fail on empty tree', () => {
        // пустое дерево — не падает
        expect(walkMdFilesGetFigures(langDir)).toEqual([]);

        // вложенное дерево — собирает все
        writeMd('a/b/page1.md', `---\ntitle: P1\n---\n\n${FIGURE_BLOCK}`);
        writeMd('a/c/page2.md', `---\ntitle: P2\n---\n\n${FIGURE_BLOCK}`);
        const figures = walkMdFilesGetFigures(langDir);
        expect(figures).toHaveLength(2);
    });
});