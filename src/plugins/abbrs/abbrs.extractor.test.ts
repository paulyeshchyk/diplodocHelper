import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extractAbbrsFromFile } from './abbrs.extractor.js';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'abbrs-extractor-'));
    langDir = path.join(root, 'ru');
    fs.mkdirSync(langDir, { recursive: true });
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

function writeMd(relPath: string, body: string): string {
    const full = path.join(langDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, 'utf8');
    return full;
}

describe('abbrs.extractor.extractAbbrsFromFile', () => {
    it('00.5.4#01 (+3) should return null when no <abbr> present', () => {
        const file = writeMd('page.md', '---\ntitle: Page\n---\n\nplain text');
        expect(extractAbbrsFromFile(file, langDir)).toBeNull();
    });

    it('00.5.4#02 (+3) should count repeated <abbr> occurrences', () => {
        const file = writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr>GOST</abbr> and <abbr>GOST</abbr>');
        const r = extractAbbrsFromFile(file, langDir);
        expect(r).not.toBeNull();
        expect(r!.occurrences.get('GOST')).toBe(2);
    });

    it('00.5.4#03 (+3) should honor data-abbr as canonical key', () => {
        const file = writeMd('page.md', '---\ntitle: Page\n---\n\n<abbr data-abbr="GOST">ГОСТ</abbr>');
        const r = extractAbbrsFromFile(file, langDir);
        expect(r!.occurrences.get('GOST')).toBe(1);
        expect(r!.occurrences.has('ГОСТ')).toBe(false);
    });

    it('00.5.4#04 (+3, +5) should skip <abbr class="…"> (term-markup)', () => {
        const file = writeMd(
            'page.md',
            '---\ntitle: Page\n---\n\n<abbr class="term">API</abbr> <abbr>GOST</abbr>',
        );
        const r = extractAbbrsFromFile(file, langDir);
        expect(r!.occurrences.has('API')).toBe(false);
        expect(r!.occurrences.get('GOST')).toBe(1);
    });

    it('00.5.4#05 (+3) should not count <abbr> inside fenced code', () => {
        const file = writeMd('page.md', '---\ntitle: Page\n---\n\n```\n<abbr>GOST</abbr>\n```\n');
        expect(extractAbbrsFromFile(file, langDir)).toBeNull();
    });
});