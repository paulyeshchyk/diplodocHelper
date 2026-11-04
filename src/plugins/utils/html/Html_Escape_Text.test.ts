import { describe, expect, it } from '@jest/globals';
import { Html_Escape_Text } from './Html_Escape_Text';

describe('Html_Escape_Text.escape', () => {
    it('00.5.3#01 should return empty string for empty input', () => {
        expect(Html_Escape_Text.escape('')).toBe('');
    });

    it('00.5.3#02 should escape & < > " in the right order (& first)', () => {
        expect(Html_Escape_Text.escape('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e');
    });

    it('00.5.3#03 should NOT escape single quote (legacy contract)', () => {
        expect(Html_Escape_Text.escape("a'b")).toBe("a'b");
    });

    it('00.5.3#04 should preserve non-ASCII (cyrillic, emoji)', () => {
        expect(Html_Escape_Text.escape('Привет😀')).toBe('Привет😀');
    });

    it('00.5.3#05 should coerce non-string input via String()', () => {
        expect(Html_Escape_Text.escape(null)).toBe('null');
        expect(Html_Escape_Text.escape(undefined)).toBe('undefined');
        expect(Html_Escape_Text.escape(42)).toBe('42');
    });

    it('00.5.3#06 should escape already-escaped entities safely (no double-escaping of &)', () => {
        // &amp; → &amp;amp; — потому что & экранируется первым. Legacy-контракт.
        expect(Html_Escape_Text.escape('&amp;')).toBe('&amp;amp;');
        expect(Html_Escape_Text.escape('&lt;')).toBe('&amp;lt;');
    });
});

describe('Html_Escape_Text frozen snapshot (historical parity of +3, +5, +7)', () => {
    // Snapshot зафиксирован из legacy `escapeHtml` (3 идентичных определения:
    // abbrs/shared, terms/shared, figures.writer) до миграции.
    // Дополнительно покрывает re-export из abbrs.model / terms.model.
    const cases: Array<[unknown, string]> = [
        ['', ''],
        ['plain', 'plain'],
        ['a&b', 'a&amp;b'],
        ['a<b', 'a&lt;b'],
        ['a>b', 'a&gt;b'],
        ['a"b', 'a&quot;b'],
        ["a'b", "a'b"],                 // одинарная кавычка НЕ экранируется
        ['a&<>"b', 'a&amp;&lt;&gt;&quot;b'],
        ['&amp;', '&amp;amp;'],          // двойное экранирование & — legacy
        ['Привет😀', 'Привет😀'],
        [null, 'null'],
        [undefined, 'undefined'],
        [42, '42'],
    ];

    it('00.5.3#19 (+3, +5, +7) should keep the frozen escapeHtml output', () => {
        for (const [input, expected] of cases) {
            expect(Html_Escape_Text.escape(input)).toBe(expected);
        }
    });
});