import { describe, expect, it } from '@jest/globals';
import { Html_Classify_File } from './Html_Classify_File';

describe('Html_Classify_File.isHtmlFile', () => {
    it('00.4.1#01 should accept lowercase .html', () => {
        expect(Html_Classify_File.isHtmlFile('a.html')).toBe(true);
        expect(Html_Classify_File.isHtmlFile('dir/sub/page.html')).toBe(true);
    });

    it('00.4.1#02 should accept mixed/upper .HTML (case-insensitive)', () => {
        expect(Html_Classify_File.isHtmlFile('a.HTML')).toBe(true);
        expect(Html_Classify_File.isHtmlFile('a.Html')).toBe(true);
    });

    it('00.4.1#03 should reject .htm (legacy behaviour)', () => {
        expect(Html_Classify_File.isHtmlFile('a.htm')).toBe(false);
    });

    it('00.4.1#04 should reject non-HTML extensions', () => {
        expect(Html_Classify_File.isHtmlFile('a.md')).toBe(false);
        expect(Html_Classify_File.isHtmlFile('a.json')).toBe(false);
        expect(Html_Classify_File.isHtmlFile('')).toBe(false);
    });

    it('00.4.1#05 should reject paths where .html appears but not as suffix', () => {
        expect(Html_Classify_File.isHtmlFile('a.html.bak')).toBe(false);
        expect(Html_Classify_File.isHtmlFile('html/a.md')).toBe(false);
    });
});

describe('Html_Classify_File.isRootIndex', () => {
    it('00.4.1#06 should accept build/index.html at buildDir root', () => {
        expect(Html_Classify_File.isRootIndex('/repo/build', '/repo/build/index.html')).toBe(true);
    });

    it('00.4.1#07 should reject nested index.html', () => {
        expect(Html_Classify_File.isRootIndex('/repo/build', '/repo/build/ru/index.html')).toBe(false);
        expect(Html_Classify_File.isRootIndex('/repo/build', '/repo/build/ru/Модули/index.html')).toBe(false);
    });

    it('00.4.1#08 should reject root-level non-index html and uppercase index.html', () => {
        expect(Html_Classify_File.isRootIndex('/repo/build', '/repo/build/404.html')).toBe(false);
        expect(Html_Classify_File.isRootIndex('/repo/build', '/repo/build/INDEX.HTML')).toBe(false);
    });
});