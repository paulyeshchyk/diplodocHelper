import { describe, expect, it } from '@jest/globals';
import { slugify_filename } from '../encoding.slugify.js';
import { Url_Transform_Filename } from './Url_Transform_Filename.ts';

describe('Url_Transform_Filename.slugify — basics', () => {
    it('00.6.4#01 should return empty string for empty input', () => {
        expect(Url_Transform_Filename.slugify('')).toBe('');
    });

    it('00.6.4#02 should pass through lowercase latin and digits', () => {
        expect(Url_Transform_Filename.slugify('abc')).toBe('abc');
        expect(Url_Transform_Filename.slugify('a1b2')).toBe('a1b2');
        expect(Url_Transform_Filename.slugify('123')).toBe('123');
    });

    it('00.6.4#03 should throw on non-string input (legacy contract)', () => {
        expect(() => Url_Transform_Filename.slugify(null as unknown as string)).toThrow(TypeError);
        expect(() => Url_Transform_Filename.slugify(undefined as unknown as string)).toThrow(TypeError);
        expect(() => Url_Transform_Filename.slugify(42 as unknown as string)).toThrow(TypeError);
    });
});

describe('Url_Transform_Filename.slugify — cyrillic preservation', () => {
    it('00.6.4#04 should preserve cyrillic and NOT transliterate', () => {
        expect(Url_Transform_Filename.slugify('Привет')).toBe('Привет');
        expect(Url_Transform_Filename.slugify('привет')).toBe('привет');
        expect(Url_Transform_Filename.slugify('Мир')).toBe('Мир');
    });

    it('00.6.4#05 should preserve original case (no lowercase)', () => {
        expect(Url_Transform_Filename.slugify('ПРИВЕТ')).toBe('ПРИВЕТ');
        expect(Url_Transform_Filename.slugify('AbC')).toBe('AbC');
    });

    it('00.6.4#06 should replace spaces between cyrillic words with "_"', () => {
        expect(Url_Transform_Filename.slugify('Привет Мир')).toBe('Привет_Мир');
        expect(Url_Transform_Filename.slugify('Справочник Товаров')).toBe('Справочник_Товаров');
    });

    it('00.6.4#07 should preserve CJK letters (via \\p{L})', () => {
        expect(Url_Transform_Filename.slugify('日本語')).toBe('日本語');
        expect(Url_Transform_Filename.slugify('한국어')).toBe('한국어');
    });
});

describe('Url_Transform_Filename.slugify — whitelist characters', () => {
    it('00.6.4#08 should preserve dots', () => {
        expect(Url_Transform_Filename.slugify('a.b.c')).toBe('a.b.c');
        expect(Url_Transform_Filename.slugify('file.md')).toBe('file.md');
    });

    it('00.6.4#09 should preserve leading/trailing dots (no trim for ".")', () => {
        expect(Url_Transform_Filename.slugify('.hidden')).toBe('.hidden');
        expect(Url_Transform_Filename.slugify('file.')).toBe('file.');
    });

    it('00.6.4#10 should preserve dashes (no collapse for "-")', () => {
        expect(Url_Transform_Filename.slugify('a-b-c')).toBe('a-b-c');
        expect(Url_Transform_Filename.slugify('a---b')).toBe('a---b');
        expect(Url_Transform_Filename.slugify('привет-мир')).toBe('привет-мир');
    });

    it('00.6.4#11 should preserve single "_" between whitelist chars', () => {
        expect(Url_Transform_Filename.slugify('a.b-c_d')).toBe('a.b-c_d');
        expect(Url_Transform_Filename.slugify('a_-_b')).toBe('a_-_b');
    });
});

describe('Url_Transform_Filename.slugify — replacement + collapse + trim', () => {
    it('00.6.4#12 should replace disallowed chars with single "_"', () => {
        expect(Url_Transform_Filename.slugify('a/b')).toBe('a_b');
        expect(Url_Transform_Filename.slugify('a\\b')).toBe('a_b');
        expect(Url_Transform_Filename.slugify('a b')).toBe('a_b');
        expect(Url_Transform_Filename.slugify('a😀b')).toBe('a_b');
    });

    it('00.6.4#13 should collapse multiple "_" from replacement', () => {
        expect(Url_Transform_Filename.slugify('a   b')).toBe('a_b');
        expect(Url_Transform_Filename.slugify('a___b')).toBe('a_b');
        expect(Url_Transform_Filename.slugify('a!!!b')).toBe('a_b');
    });

    it('00.6.4#14 should trim leading and trailing "_"', () => {
        expect(Url_Transform_Filename.slugify('  a  ')).toBe('a');
        expect(Url_Transform_Filename.slugify('!!!a!!!')).toBe('a');
        expect(Url_Transform_Filename.slugify('___a___')).toBe('a');
    });

    it('00.6.4#15 should return empty for input that collapses to only "_"', () => {
        expect(Url_Transform_Filename.slugify('   ')).toBe('');
        expect(Url_Transform_Filename.slugify('!!!')).toBe('');
        expect(Url_Transform_Filename.slugify('😀')).toBe('');
    });
});

describe('Url_Transform_Filename.slugify — cross-module invariants', () => {
    it('00.6.4#20 (+9) should match legacy slugify_filename via shim', () => {
        const cases = [
            '',
            'abc',
            'Привет Мир',
            'ПРИВЕТ',
            'a.b.c',
            '.hidden',
            'file.',
            'a-b-c',
            'a___b',
            'a/b',
            'a😀b',
            '   ',
            'test@example.com',
        ];
        for (const c of cases) {
            expect(Url_Transform_Filename.slugify(c)).toBe(slugify_filename(c));
        }
    });
});

describe('Url_Transform_Filename frozen snapshot (legacy slugify_filename)', () => {
    // Snapshot зафиксирован из legacy `slugify_filename` до миграции.
    // Любое изменение в правилах сломает эти кейсы — и это правильно:
    // смена правил = переименование файлов в docs/ru/**/Контексты/.
    const cases: Array<[string, string]> = [
        ['', ''],
        ['abc', 'abc'],
        ['abc123', 'abc123'],
        ['Привет', 'Привет'],
        ['ПРИВЕТ', 'ПРИВЕТ'],
        ['Привет Мир', 'Привет_Мир'],
        ['привет-мир', 'привет-мир'],
        ['a.b.c', 'a.b.c'],
        ['.hidden', '.hidden'],
        ['file.', 'file.'],
        ['a-b-c', 'a-b-c'],
        ['a___b', 'a_b'],
        ['a_-_b', 'a_-_b'],
        ['a.b-c_d', 'a.b-c_d'],
        ['a/b', 'a_b'],
        ['a\\b', 'a_b'],
        ['a b', 'a_b'],
        ['  a  ', 'a'],
        ['a😀b', 'a_b'],
        ['😀', ''],
        ['test@example.com', 'test_example.com'],
        ['日本語', '日本語'],
    ];

    it('00.6.4#19 should keep frozen legacy slugify_filename output', () => {
        for (const [input, expected] of cases) {
            expect(Url_Transform_Filename.slugify(input)).toBe(expected);
        }
    });
});