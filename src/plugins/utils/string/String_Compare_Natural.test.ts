import { describe, expect, it } from '@jest/globals';

import { String_Compare_Natural } from './String_Compare_Natural.ts';

describe('String_Compare_Natural.compare', () => {
    it('00.1.1#01 should return 0 for identical strings', () => {
        expect(String_Compare_Natural.compare('abc', 'abc')).toBe(0);
    });

    it('00.1.1#02 should order numeric suffix: 2 before 10', () => {
        expect(String_Compare_Natural.compare('a2', 'a10')).toBeLessThan(0);
        expect(String_Compare_Natural.compare('a10', 'a2')).toBeGreaterThan(0);
    });

    it('00.1.1#03 should fall back to lexicographic compare for non-numeric segments', () => {
        expect(String_Compare_Natural.compare('abc', 'abd')).toBeLessThan(0);
        expect(String_Compare_Natural.compare('abd', 'abc')).toBeGreaterThan(0);
    });

    it('00.1.1#04 should be case-sensitive (uppercase < lowercase)', () => {
        expect(String_Compare_Natural.compare('A', 'a')).toBeLessThan(0);
        expect(String_Compare_Natural.compare('a', 'A')).toBeGreaterThan(0);
    });

    it('00.1.1#05 should treat shorter token stream as less', () => {
        expect(String_Compare_Natural.compare('a', 'a1')).toBeLessThan(0);
        expect(String_Compare_Natural.compare('a1', 'a')).toBeGreaterThan(0);
    });

    it('00.1.1#06 should compare pure numeric strings as numbers', () => {
        expect(String_Compare_Natural.compare('2', '10')).toBeLessThan(0);
        expect(String_Compare_Natural.compare('10', '10')).toBe(0);
        expect(String_Compare_Natural.compare('100', '99')).toBeGreaterThan(0);
    });

    it('00.1.1#07 should interleave text and digits (a10b > a2b)', () => {
        expect(String_Compare_Natural.compare('a10b', 'a2b')).toBeGreaterThan(0);
        expect(String_Compare_Natural.compare('a2b', 'a10b')).toBeLessThan(0);
    });

    it('00.1.1#08 should be anti-symmetric and transitive on sample set', () => {
        const set = ['a1', 'a2', 'a10', 'b1', 'b10'];
        for (const x of set) {
            for (const y of set) {
                const xy = Math.sign(String_Compare_Natural.compare(x, y));
                const yx = Math.sign(String_Compare_Natural.compare(y, x));
                if ((xy === 0) && (yx === 0))
                {
                    expect(0).toBe(0);
                } else {
                    expect(xy).toBe(-yx);
                }
            }
        }
    });

    it('00.1.1#09 should match legacy naturalCompare output on the two consumer datasets', () => {
        // Regression: этот кейз гарантирует, что при замене двух дублей
        // поведение сортировки catalog.modules / modules-table не меняется.
        // Источники: feature 54 (collectCatalog) и feature 56 (renderModules).
        const ids = ['10', '2', '1', '11', '3'];
        const expected = ['1', '2', '3', '10', '11'];
        const sorted = [...ids].sort(String_Compare_Natural.compare);
        expect(sorted).toEqual(expected);
    });
});