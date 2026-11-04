import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { walkMdFilesGetTerms } from './terms.collector';
import type { TermMap } from './terms.types';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'terms-collector-'));
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

describe('terms.collector.walkMdFilesGetTerms (+5)', () => {
    it('00.4.2#21 (+5) should collect <abbr class="term"> from regular .md files', () => {
        writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr class="term">API</abbr>');
        const map: TermMap = walkMdFilesGetTerms(langDir);
        expect(map['API']).toBeDefined();
        expect(map['API'].pages).toHaveLength(1);
    });

    it('00.4.2#22 (+5) should skip generated terms output dir (skipFullPaths)', () => {
        // per terms.paths.yaml: ru → 'Дополнительнаяинформация/Терминыиопределения'
        writeMd('Дополнительнаяинформация/Терминыиопределения/index.md', '<abbr class="term">API</abbr>');
        writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr class="term">CLI</abbr>');
        const map: TermMap = walkMdFilesGetTerms(langDir);
        expect(map['CLI']).toBeDefined();
        expect(map['API']).toBeUndefined();
    });

    it('00.4.2#23 (+5) should skip SKIP_DIRS (terms, abbrs, contexts, helptags, figures, roadmap)', () => {
        for (const dir of ['terms', 'abbrs', 'contexts', 'helptags', 'figures', 'roadmap']) {
            writeMd(`${dir}/page.md`, '<abbr class="term">SKIP_ME</abbr>');
        }
        writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr class="term">KEEP</abbr>');
        const map: TermMap = walkMdFilesGetTerms(langDir);
        expect(map['KEEP']).toBeDefined();
        expect(map['SKIP_ME']).toBeUndefined();
    });

    it('00.4.2#24 (+5) should skip .hidden dirs (skipHidden)', () => {
        writeMd('.hidden/page.md', '<abbr class="term">HIDDEN</abbr>');
        expect(walkMdFilesGetTerms(langDir)['HIDDEN']).toBeUndefined();
    });

    it('00.4.2#25 (+5) should skip _underscore dirs (skipUnderscore)', () => {
        writeMd('_assets/page.md', '<abbr class="term">UNDERSCORE</abbr>');
        expect(walkMdFilesGetTerms(langDir)['UNDERSCORE']).toBeUndefined();
    });

    it('00.4.2#26 (+5) should not fail on empty tree', () => {
        expect(walkMdFilesGetTerms(langDir)).toEqual({});
    });

    it('00.4.2#27 (+5) should walk nested dirs and aggregate occurrences', () => {
        writeMd('section/chapter/page.md', '---\ntitle: Page\n---\n\n<abbr class="term">API</abbr> <abbr class="term">API</abbr>');
        writeMd('other.md', '---\ntitle: Other\n---\n\n<abbr class="term">API</abbr>');
        const map: TermMap = walkMdFilesGetTerms(langDir);
        expect(map['API'].pages).toHaveLength(2);
        expect(map['API'].totalOccurrences).toBe(3);
    });
});