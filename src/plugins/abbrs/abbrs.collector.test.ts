import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { walkMdFilesGetAbbrs } from './abbrs.collector.js';
import type { AbbrMap } from './abbrs.types.ts';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'abbrs-collector-'));
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

describe('abbrs.collector.walkMdFilesGetAbbrs (+3)', () => {
    it('00.4.2#14 (+3) should collect <abbr> from regular .md files', () => {
        writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr>GOST</abbr>');
        const map: AbbrMap = walkMdFilesGetAbbrs(langDir);
        expect(map['GOST']).toBeDefined();
        expect(map['GOST'].pages).toHaveLength(1);
        expect(map['GOST'].totalOccurrences).toBe(1);
    });

    it('00.4.2#15 (+3) should skip generated abbrs output dir (skipFullPaths)', () => {
        // per abbrs.paths.yaml: ru → 'Дополнительнаяинформация/Списоксокращений'
        writeMd('Дополнительнаяинформация/Списоксокращений/index.md', '<abbr>GOST</abbr>');
        writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr>API</abbr>');
        const map: AbbrMap = walkMdFilesGetAbbrs(langDir);
        expect(map['API']).toBeDefined();
        expect(map['GOST']).toBeUndefined();
    });

    it('00.4.2#16 (+3) should skip SKIP_DIRS (terms, contexts, helptags, figures, roadmap)', () => {
        for (const dir of ['terms', 'contexts', 'helptags', 'figures', 'roadmap']) {
            writeMd(`${dir}/page.md`, '<abbr>SKIP_ME</abbr>');
        }
        writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr>KEEP</abbr>');
        const map: AbbrMap = walkMdFilesGetAbbrs(langDir);
        expect(map['KEEP']).toBeDefined();
        expect(map['SKIP_ME']).toBeUndefined();
    });

    it('00.4.2#17 (+3) should skip .hidden dirs (skipHidden)', () => {
        writeMd('.hidden/page.md', '<abbr>HIDDEN</abbr>');
        const map: AbbrMap = walkMdFilesGetAbbrs(langDir);
        expect(map['HIDDEN']).toBeUndefined();
    });

    it('00.4.2#18 (+3) should skip _underscore dirs (skipUnderscore)', () => {
        writeMd('_assets/page.md', '<abbr>UNDERSCORE</abbr>');
        const map: AbbrMap = walkMdFilesGetAbbrs(langDir);
        expect(map['UNDERSCORE']).toBeUndefined();
    });

    it('00.4.2#19 (+3) should not fail on empty tree', () => {
        expect(walkMdFilesGetAbbrs(langDir)).toEqual({});
    });

    it('00.4.2#20 (+3) should walk nested dirs and aggregate occurrences', () => {
        writeMd('section/chapter/page.md', '---\ntitle: Page\n---\n\n<abbr>GOST</abbr> <abbr>GOST</abbr>');
        writeMd('other.md', '---\ntitle: Other\n---\n\n<abbr>GOST</abbr>');
        const map: AbbrMap = walkMdFilesGetAbbrs(langDir);
        expect(map['GOST'].pages).toHaveLength(2);
        expect(map['GOST'].totalOccurrences).toBe(3);
    });
});