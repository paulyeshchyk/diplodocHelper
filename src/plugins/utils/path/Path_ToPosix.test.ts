import { describe, expect, it } from '@jest/globals';
import * as path from 'node:path';
import { Path_ToPosix } from './Path_ToPosix.ts';

describe('Path_ToPosix.convert', () => {
    it('00.4.3#01 should be a no-op for forward-slash paths on POSIX', () => {
        // На POSIX path.sep === '/', split('/').join('/') === identity
        expect(Path_ToPosix.convert('a/b/c')).toBe('a/b/c');
        expect(Path_ToPosix.convert('./a/b')).toBe('./a/b');
    });

    it('00.4.3#02 should convert native separator to forward slash', () => {
        // На любой ОС строим путь с нативным разделителем и проверяем
        // что convert() даёт forward slashes.
        const nativePath = ['a', 'b', 'c'].join(path.sep);
        expect(Path_ToPosix.convert(nativePath)).toBe('a/b/c');
    });

    it('00.4.3#03 should be idempotent', () => {
        const input = ['x', 'y'].join(path.sep);
        expect(Path_ToPosix.convert(Path_ToPosix.convert(input))).toBe('x/y');
    });

    it('00.4.3#04 should preserve empty segments', () => {
        expect(Path_ToPosix.convert('a//b')).toBe('a//b');
        expect(Path_ToPosix.convert('/a/b/')).toBe('/a/b/');
    });

    it('00.4.3#05 should handle empty string', () => {
        expect(Path_ToPosix.convert('')).toBe('');
    });
});