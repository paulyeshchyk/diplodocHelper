import { describe, expect, it } from '@jest/globals';
import { String_Transliterate_Cyrillic } from './String_Transliterate_Cyrillic.ts';

describe('String_Transliterate_Cyrillic.toLatin', () => {
    it('00.6.1#01 should transliterate lowercase cyrillic', () => {
        expect(String_Transliterate_Cyrillic.toLatin('привет')).toBe('privet');
    });

    it('00.6.1#02 should lowercase input before transliterating', () => {
        expect(String_Transliterate_Cyrillic.toLatin('Привет')).toBe('privet');
        expect(String_Transliterate_Cyrillic.toLatin('ПРИВЕТ')).toBe('privet');
    });

    it('00.6.1#03 should handle multi-char cyrillic and preserve unmapped ь/ъ', () => {
        // ж/ш/щ → multi-char
        expect(String_Transliterate_Cyrillic.toLatin('жизн')).toBe('zhizn');
        expect(String_Transliterate_Cyrillic.toLatin('жизнь')).toBe('zhiznь'); // ь не в карте
        expect(String_Transliterate_Cyrillic.toLatin('шум')).toBe('shum');
        expect(String_Transliterate_Cyrillic.toLatin('щит')).toBe('shit');
        // ъ тоже не в карте
        expect(String_Transliterate_Cyrillic.toLatin('подъезд')).toBe('podъezd');
    });

    it('00.6.1#04 should handle ё, ю, я, э', () => {
        expect(String_Transliterate_Cyrillic.toLatin('ёлка')).toBe('yolka');
        expect(String_Transliterate_Cyrillic.toLatin('юла')).toBe('yula');
        expect(String_Transliterate_Cyrillic.toLatin('яма')).toBe('yama');
        expect(String_Transliterate_Cyrillic.toLatin('эра')).toBe('yera'); // э → ye, не e
    });

    it('00.6.1#05 should leave latin unchanged (but lowercase)', () => {
        expect(String_Transliterate_Cyrillic.toLatin('ABC')).toBe('abc');
        expect(String_Transliterate_Cyrillic.toLatin('test')).toBe('test');
    });

    it('00.6.1#06 should preserve non-letter symbols not in map', () => {
        expect(String_Transliterate_Cyrillic.toLatin('a-b_c.d')).toBe('a-b_c.d');
        expect(String_Transliterate_Cyrillic.toLatin('a/b c')).toBe('a/b c');
    });

    it('00.6.1#07 should map special URL symbols to words', () => {
        expect(String_Transliterate_Cyrillic.toLatin('a|b')).toBe('aorb');
        expect(String_Transliterate_Cyrillic.toLatin('a&b')).toBe('aandb');
        expect(String_Transliterate_Cyrillic.toLatin('100%')).toBe('100percent');
        expect(String_Transliterate_Cyrillic.toLatin('$x')).toBe('dollarx');
        expect(String_Transliterate_Cyrillic.toLatin('a<b>c')).toBe('alessbgreaterc');
    });

    it('00.6.1#08 should return empty string for non-string input', () => {
        expect(String_Transliterate_Cyrillic.toLatin(null)).toBe('');
        expect(String_Transliterate_Cyrillic.toLatin(undefined)).toBe('');
        expect(String_Transliterate_Cyrillic.toLatin(42)).toBe('');
        expect(String_Transliterate_Cyrillic.toLatin({})).toBe('');
    });

    it('00.6.1#09 should handle empty string', () => {
        expect(String_Transliterate_Cyrillic.toLatin('')).toBe('');
    });

    it('00.6.1#10 should transliterate mixed text and identifiers', () => {
        expect(String_Transliterate_Cyrillic.toLatin('ГОСТ 11371-78')).toBe('gost 11371-78');
    });
});

describe('String_Transliterate_Cyrillic.fromLatinLegacy', () => {
    it('00.6.1#11 should handle simple latin', () => {
        expect(String_Transliterate_Cyrillic.fromLatinLegacy('privet')).toBe('привет');
    });

    it('00.6.1#12 should prefer longest match (zh → ж, not z+h)', () => {
        expect(String_Transliterate_Cyrillic.fromLatinLegacy('zhizn')).toBe('жизн');
    });

    it('00.6.1#13 should map multi-letter to single char', () => {
        expect(String_Transliterate_Cyrillic.fromLatinLegacy('shum')).toBe('шум');
    });

    it('00.6.1#14 should lowercase input first', () => {
        expect(String_Transliterate_Cyrillic.fromLatinLegacy('PRIVET')).toBe('привет');
    });

    it('00.6.1#15 should preserve latin chars not in reverse map (x stays x, not х)', () => {
        // x нет в latToCyrLegend — сохраняется как x.
        // В прямом направлении х → h (не x), поэтому обратное х↔x несовместимо.
        expect(String_Transliterate_Cyrillic.fromLatinLegacy('xyz')).toBe('xыз');
    });

    it('00.6.1#16 should return empty string for non-string input', () => {
        expect(String_Transliterate_Cyrillic.fromLatinLegacy(null)).toBe('');
        expect(String_Transliterate_Cyrillic.fromLatinLegacy(42)).toBe('');
    });
});

describe('String_Transliterate_Cyrillic frozen snapshot', () => {
    const cases: Array<[string, string]> = [
        ['', ''],
        ['a', 'a'],
        ['A', 'a'],
        ['Привет', 'privet'],
        ['ПРИВЕТ', 'privet'],
        ['жизнь', 'zhiznь'],           // ь сохраняется — важно для drift-guard
        ['жизн', 'zhizn'],              // без ь — чистый zhizn
        ['ёлка', 'yolka'],
        ['щит', 'shit'],
        ['ГОСТ 11371-78', 'gost 11371-78'],
        ['test 123', 'test 123'],
    ];

    it('00.6.1#17 should keep frozen legacy toLatin output', () => {
        for (const [input, expected] of cases) {
            expect(String_Transliterate_Cyrillic.toLatin(input)).toBe(expected);
        }
    });
});

describe('String_Transliterate_Cyrillic unmapped cyrillic letters', () => {
    it('00.6.1#18 should preserve ь and ъ as-is (not transliterated)', () => {
        expect(String_Transliterate_Cyrillic.toLatin('ь')).toBe('ь');
        expect(String_Transliterate_Cyrillic.toLatin('ъ')).toBe('ъ');
        expect(String_Transliterate_Cyrillic.toLatin('соль')).toBe('solь');
        expect(String_Transliterate_Cyrillic.toLatin('объект')).toBe('obъekt');

        // Контраст с slugify_latin_alphanumeric (в B-2):
        // там [^a-z0-9] вырежет ь/ъ → 'sol', 'obekt'
        // Т.е. для имён файлов и anchor'ов legacy ведёт себя корректно,
        // только напрямую через toLatin ь/ъ «протекают».
    });
});