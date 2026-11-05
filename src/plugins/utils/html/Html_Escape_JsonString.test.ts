import { describe, expect, it } from '@jest/globals';
import { Html_Escape_JsonString } from './Html_Escape_JsonString.ts';

describe('Html_Escape_JsonString.escape', () => {
    it('00.5.3#07 should return empty string for empty input', () => {
        expect(Html_Escape_JsonString.escape('')).toBe('');
    });

    it('00.5.3#08 should escape < and > to entities', () => {
        expect(Html_Escape_JsonString.escape('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    });

    it('00.5.3#09 should escape double quote to \\"', () => {
        expect(Html_Escape_JsonString.escape('a"b')).toBe('a\\"b');
    });

    it('00.5.3#10 should escape \\n \\r \\t', () => {
        expect(Html_Escape_JsonString.escape('a\nb\rc\td')).toBe('a\\nb\\rc\\td');
    });

    it('00.5.3#11 should NOT escape & (already escaped by Html_Escape_Text upstream)', () => {
        expect(Html_Escape_JsonString.escape('a&amp;b')).toBe('a&amp;b');
    });

    it('00.5.3#12 should coerce non-string input via String()', () => {
        expect(Html_Escape_JsonString.escape(null)).toBe('null');
        expect(Html_Escape_JsonString.escape(undefined)).toBe('undefined');
    });

    it('00.5.3#24 should roundtrip through JSON.parse and decode \\" and \\n back', () => {
        const original = '<a href="x">t</a>\nline';
        const escaped = Html_Escape_JsonString.escape(original);

        // escaped = &lt;a href=\"x\"&gt;t&lt;/a&gt;\nline
        //   где \" — два символа (backslash + quote)
        //       \n — два символа (backslash + n)
        expect(escaped).toBe('&lt;a href=\\"x\\"&gt;t&lt;/a&gt;\\nline');

        // JSON.parse декодирует escape-последовательности обратно:
        //   \" → "
        //   \n → реальный перенос строки
        const parsed = JSON.parse(`"${escaped}"`);
        expect(parsed).toBe('&lt;a href="x"&gt;t&lt;/a&gt;\nline');

        expect(() => JSON.parse(`"${escaped}"`)).not.toThrow();
    });
});

describe('Html_Escape_JsonString frozen snapshot (historical parity of +3, +5)', () => {
    // Snapshot зафиксирован из legacy `jsonEscapeHtmlForDiplodoc`
    // (abbrs/shared и terms/shared, идентичные копии) до миграции.
    // Теперь исполняет роль drift-guard для TS-модуля.
    const cases: Array<[unknown, string]> = [
        ['', ''],
        ['plain', 'plain'],
        ['<b>', '&lt;b&gt;'],
        ['a"b', 'a\\"b'],              // \" = backslash + quote
        ['a\nb\tc\rd', 'a\\nb\\tc\\rd'], // \n \t \r → backslash + n/t/r
        ['a&amp;b', 'a&amp;b'],         // & не трогается
        [null, 'null'],
        [undefined, 'undefined'],
    ];

    it('00.5.3#22 (+3, +5) should keep the frozen abbrs/terms output', () => {
        for (const [input, expected] of cases) {
            expect(Html_Escape_JsonString.escape(input)).toBe(expected);
        }
    });
});