import { describe, expect, it } from '@jest/globals';
import { InlineAnnotation_Make_AnchorId } from '../inline-annotation/InlineAnnotation_Make_AnchorId.ts';
import { buildFigureId } from '../md.links.figure.js';
import { Url_Transform_Segment } from './Url_Transform_Segment.ts';

describe('Url_Transform_Segment.slugify — basics', () => {
    it('00.6.2#01 should return empty string for empty input', () => {
        expect(Url_Transform_Segment.slugify('')).toBe('');
    });

    it('00.6.2#02 should return empty string for non-string input', () => {
        expect(Url_Transform_Segment.slugify(null)).toBe('');
        expect(Url_Transform_Segment.slugify(undefined)).toBe('');
        expect(Url_Transform_Segment.slugify(42)).toBe('');
        expect(Url_Transform_Segment.slugify(0)).toBe('');
        expect(Url_Transform_Segment.slugify(false)).toBe('');
        expect(Url_Transform_Segment.slugify({})).toBe('');
    });

    it('00.6.2#03 should pass through lowercase latin unchanged', () => {
        expect(Url_Transform_Segment.slugify('abc')).toBe('abc');
        expect(Url_Transform_Segment.slugify('abc123')).toBe('abc123');
    });

    it('00.6.2#04 should lowercase uppercase latin', () => {
        expect(Url_Transform_Segment.slugify('ABC')).toBe('abc');
        expect(Url_Transform_Segment.slugify('Hello World')).toBe('hello_world');
    });

    it('00.6.2#05 should preserve digit-only strings', () => {
        expect(Url_Transform_Segment.slugify('123')).toBe('123');
        expect(Url_Transform_Segment.slugify('0')).toBe('0');
    });
});

describe('Url_Transform_Segment.slugify — separator normalisation', () => {
    it('00.6.2#06 should replace spaces with single underscore', () => {
        expect(Url_Transform_Segment.slugify('a b')).toBe('a_b');
        expect(Url_Transform_Segment.slugify('a  b')).toBe('a_b');
        expect(Url_Transform_Segment.slugify('a   b   c')).toBe('a_b_c');
    });

    it('00.6.2#07 should collapse runs of punctuation into one underscore', () => {
        expect(Url_Transform_Segment.slugify('a---b')).toBe('a_b');
        expect(Url_Transform_Segment.slugify('a!!!b')).toBe('a_b');
        expect(Url_Transform_Segment.slugify('a_ _b')).toBe('a_b');
        expect(Url_Transform_Segment.slugify('a.b.c')).toBe('a_b_c');
    });

    it('00.6.2#08 should trim leading and trailing separators', () => {
        expect(Url_Transform_Segment.slugify('  a  ')).toBe('a');
        expect(Url_Transform_Segment.slugify('---a---')).toBe('a');
        expect(Url_Transform_Segment.slugify('!!!a!!!')).toBe('a');
        expect(Url_Transform_Segment.slugify('__a__')).toBe('a');
    });

    it('00.6.2#09 should return empty string for input with only separators', () => {
        expect(Url_Transform_Segment.slugify('   ')).toBe('');
        expect(Url_Transform_Segment.slugify('---')).toBe('');
        expect(Url_Transform_Segment.slugify('!!!???')).toBe('');
        expect(Url_Transform_Segment.slugify('_')).toBe('');
        expect(Url_Transform_Segment.slugify('_ _')).toBe('');
    });

    it('00.6.2#10 should drop emoji (not latin-alphanumeric)', () => {
        expect(Url_Transform_Segment.slugify('a😀b')).toBe('a_b');
        expect(Url_Transform_Segment.slugify('😀')).toBe('');
    });
});

describe('Url_Transform_Segment.slugify — cyrillic', () => {
    it('00.6.2#11 should transliterate cyrillic and lowercase in one step', () => {
        expect(Url_Transform_Segment.slugify('Привет')).toBe('privet');
        expect(Url_Transform_Segment.slugify('ПРИВЕТ')).toBe('privet');
        expect(Url_Transform_Segment.slugify('привет')).toBe('privet');
    });

    it('00.6.2#12 should handle cyrillic with spaces and punctuation', () => {
        expect(Url_Transform_Segment.slugify('Привет Мир')).toBe('privet_mir');
        expect(Url_Transform_Segment.slugify('Привет, Мир!')).toBe('privet_mir');
    });

    it('00.6.2#13 should handle ь/ъ — trailing is trimmed, middle becomes "_"', () => {
        // ь на конце → '_' → trim → исчезает
        expect(Url_Transform_Segment.slugify('жизнь')).toBe('zhizn');
        // ь в середине → '_' separator (не удаляется, иначе склеятся соседние буквы)
        expect(Url_Transform_Segment.slugify('солью')).toBe('sol_yu');
        // ъ в середине → '_' separator
        expect(Url_Transform_Segment.slugify('объект')).toBe('ob_ekt');
    });

    it('00.6.2#14 should handle real-world gost code', () => {
        expect(Url_Transform_Segment.slugify('ГОСТ 11371-78')).toBe('gost_11371_78');
        expect(Url_Transform_Segment.slugify('ГОСТ Р 34.10-2012')).toBe('gost_r_34_10_2012');
    });
});

describe('Url_Transform_Segment.slugify — cross-module invariants', () => {
    it('00.6.2#15 (+3, +5) should drive InlineAnnotation_Make_AnchorId for abbr/term', () => {
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('abbr', 'Привет')).toBe('abbr-privet');
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('term', 'API v2')).toBe('term-api_v2');
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('abbr', '')).toBe('abbr-');
    });

    it('00.6.2#16 (+7) should drive md.links.figure.buildFigureId', () => {
        expect(buildFigureId('Hello World')).toBe('fig-hello_world');
        expect(buildFigureId('Рисунок 1')).toBe('fig-risunok_1');
    });

    it('00.6.2#17 (+2) should drive gosts anchor id shape', () => {
        expect(Url_Transform_Segment.slugify('ГОСТ 11371-78')).toBe('gost_11371_78');
    });
});

describe('Url_Transform_Segment frozen snapshot (legacy slugify_latin_alphanumeric)', () => {
    // Snapshot зафиксирован из legacy `slugify_latin_alphanumeric` до миграции.
    // Любое изменение в правилах (разделитель, набор символов, trim) сломает
    // эти кейсы — и это правильный сигнал: смена правил = переименование
    // генерируемых файлов и anchor'ов.
    const cases: Array<[string, string]> = [
        ['', ''],
        ['abc', 'abc'],
        ['ABC', 'abc'],
        ['abc123', 'abc123'],
        ['API v2', 'api_v2'],
        ['  a  b  ', 'a_b'],
        ['a---b', 'a_b'],
        ['!!!a!!!', 'a'],
        ['Привет', 'privet'],
        ['Привет Мир!', 'privet_mir'],
        ['жизнь', 'zhizn'],            // trailing ь
        ['солью', 'sol_yu'],           // middle ь
        ['объект', 'ob_ekt'],          // middle ъ  ← новый
        ['ГОСТ 11371-78', 'gost_11371_78'],
        ['my-file name.txt', 'my_file_name_txt'],
        ['a/b/c', 'a_b_c'],
        ['test@example.com', 'test_example_com'],
    ];

    it('00.6.2#18 should keep frozen legacy slugify_latin_alphanumeric output', () => {
        for (const [input, expected] of cases) {
            expect(Url_Transform_Segment.slugify(input)).toBe(expected);
        }
    });
});