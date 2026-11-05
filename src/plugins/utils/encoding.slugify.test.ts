import { describe, expect, it } from '@jest/globals';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { slugify_latin } = require('./encoding.slugify');

/**
 * `slugify_latin` — dead-code с `@deprecated` (см. JSDoc в encoding.slugify.js).
 *
 * Тест фиксирует текущий контракт, чтобы будущее удаление (или случайное
 * изменение при рефакторинге соседних slugify-функций) не прошло незаметно.
 *
 * Как только функция будет удалена — удалить и этот файл.
 */
describe('slugify_latin (legacy, @deprecated)', () => {
    it('00.6.5#01 should transliterate cyrillic segments', () => {
        expect(slugify_latin('Привет/Мир')).toBe('privet/mir');
        expect(slugify_latin('ABC/def')).toBe('abc/def');
    });

    it('00.6.5#02 should preserve slashes as segment separators', () => {
        expect(slugify_latin('a/b/c')).toBe('a/b/c');
        expect(slugify_latin('/foo/bar')).toBe('/foo/bar');
        expect(slugify_latin('foo/')).toBe('foo/');
    });

    it('00.6.5#03 should return falsy input unchanged', () => {
        expect(slugify_latin('')).toBe('');
        expect(slugify_latin(null)).toBe(null);
        expect(slugify_latin(undefined)).toBe(undefined);
        expect(slugify_latin(0)).toBe(0);
    });

    it('00.6.5#04 should preserve non-slash chars (no normalization)', () => {
        expect(slugify_latin('a b')).toBe('a b');
        expect(slugify_latin('a.b')).toBe('a.b');
        expect(slugify_latin('a@b')).toBe('a@b');
    });

    it('00.6.5#05 should handle special URL symbols via transliterate', () => {
        expect(slugify_latin('a|b')).toBe('aorb');
        expect(slugify_latin('100%')).toBe('100percent');
        expect(slugify_latin('a&b')).toBe('aandb');
    });

    it('00.6.5#06 should preserve empty segments between slashes', () => {
        // split('/') → ['', 'foo', '', 'bar'] → transliterate('') = '' → join → '/foo//bar'
        expect(slugify_latin('/foo//bar')).toBe('/foo//bar');
    });
});