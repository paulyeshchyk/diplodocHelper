import { describe, expect, it } from '@jest/globals';
import { String_Slice_Middle } from './String_Slice_Middle';

describe('String_Slice_Middle.truncate', () => {
    it('00.3.1#01 should return input untouched when within maxLength', () => {
        expect(String_Slice_Middle.truncate('abc', 5, '...')).toBe('abc');
    });

    it('00.3.1#02 should return input untouched at exact boundary (legacy <=)', () => {
        expect(String_Slice_Middle.truncate('abcde', 5, '...')).toBe('abcde');
    });

    it('00.3.1#03 should use default maxLength=52 and separator="..."', () => {
        const short = 'x'.repeat(52);
        expect(String_Slice_Middle.truncate(short)).toBe(short);

        const long = 'x'.repeat(53);
        const r = String_Slice_Middle.truncate(long);
        // keep = floor((52 - 3) / 2) = 24 → 24 + 3 + 24 = 51
        expect(r).toBe('x'.repeat(24) + '...' + 'x'.repeat(24));
        expect(r.length).toBe(51);
    });

    it('00.3.1#04 should split evenly for odd keep', () => {
        // len=11 > 10 → keep = floor((10 - 3) / 2) = 3
        expect(String_Slice_Middle.truncate('aaaaaaaaaaa', 10, '...')).toBe('aaa...aaa');
    });

    it('00.3.1#05 should respect custom separator length', () => {
        // len=11 > 10, sep='…' (len 1) → keep = floor((10 - 1) / 2) = 4
        expect(String_Slice_Middle.truncate('aaaaaaaaaaa', 10, '…')).toBe('aaaa…aaaa');
    });

    it('00.3.1#06 should preserve legacy edge when maxLength < separator.length', () => {
        // keep = floor((2 - 3) / 2) = -1
        // slice(0, -1) + '...' + slice(1) === 'abcd' + '...' + 'bcde'
        expect(String_Slice_Middle.truncate('abcde', 2, '...')).toBe('abcd...bcde');
    });

    it('00.3.1#07 should return empty string for empty input', () => {
        expect(String_Slice_Middle.truncate('', 10, '...')).toBe('');
    });

    it('00.3.1#08 should throw on non-string (parity with legacy crash)', () => {
        expect(() => String_Slice_Middle.truncate(42 as unknown as string)).toThrow(TypeError);
        expect(() => String_Slice_Middle.truncate(null as unknown as string)).toThrow(TypeError);
    });
});