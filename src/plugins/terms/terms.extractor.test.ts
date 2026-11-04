import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extractTermsFromFile } from './terms.extractor';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'terms-extractor-'));
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

describe('terms.extractor.extractTermsFromFile', () => {
    it('00.5.4#11 (+5, +3) should count only <abbr class="term">, skip plain <abbr>', () => {
        const file = writeMd(
            'page.md',
            '---\ntitle: Page\n---\n\n<abbr class="term">API</abbr> <abbr>GOST</abbr>',
        );
        const r = extractTermsFromFile(file, langDir);
        expect(r!.occurrences.get('API')).toBe(1);
        expect(r!.occurrences.has('GOST')).toBe(false);
    });

    it('00.5.4#12 (+5) should honor data-term as canonical key', () => {
        const file = writeMd(
            'page.md',
            '---\ntitle: Page\n---\n\n<abbr class="term" data-term="API">API-interface</abbr>',
        );
        const r = extractTermsFromFile(file, langDir);
        expect(r!.occurrences.get('API')).toBe(1);
    });

    it('00.5.4#13 (+5) should return null when no term markup present', () => {
        const file = writeMd('page.md', '---\ntitle: Page\n---\n\nplain <abbr>GOST</abbr>');
        expect(extractTermsFromFile(file, langDir)).toBeNull();
    });
});