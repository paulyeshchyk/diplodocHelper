import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { String_Format_Size } from './String_Format_Size.ts';

/**
 * Извлекает `function <name>(...) { ... }` из произвольного JS-исходника
 * с балансировкой фигурных скобок. Нужно только для parity-теста
 * с browser-скриптом, который нельзя `require`.
 */
function extractFunction(source: string, name: string): (bytes: unknown) => string {
    const start = source.indexOf(`function ${name}`);
    if (start === -1) throw new Error(`function ${name} not found`);
    const open = source.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) {
                const body = source.slice(start, i + 1);
                // eslint-disable-next-line no-new-func
                return new Function(`${body}; return ${name};`)() as (bytes: unknown) => string;
            }
        }
    }
    throw new Error(`unbalanced braces for ${name}`);
}

describe('String_Format_Size.format (plain)', () => {
    it('00.3.2#01 should return empty string for non-number', () => {
        expect(String_Format_Size.format('123')).toBe('');
        expect(String_Format_Size.format(null)).toBe('');
        expect(String_Format_Size.format(undefined)).toBe('');
    });

    it('00.3.2#02 should return empty string for negative', () => {
        expect(String_Format_Size.format(-1)).toBe('');
        expect(String_Format_Size.format(-1024)).toBe('');
    });

    it('00.3.2#03 should format zero as "0 Б"', () => {
        expect(String_Format_Size.format(0)).toBe('0 Б');
    });

    it('00.3.2#04 should format plain bytes without unit scaling', () => {
        expect(String_Format_Size.format(1)).toBe('1 Б');
        expect(String_Format_Size.format(999)).toBe('999 Б');
        expect(String_Format_Size.format(1023)).toBe('1023 Б');
    });

    it('00.3.2#05 should scale to KB at 1024 boundary', () => {
        expect(String_Format_Size.format(1024)).toBe('1.0 КБ');
        expect(String_Format_Size.format(1536)).toBe('1.5 КБ');
    });

    it('00.3.2#06 should scale to MB at 1024*1024 boundary', () => {
        expect(String_Format_Size.format(1024 * 1024)).toBe('1.0 МБ');
        expect(String_Format_Size.format(2 * 1024 * 1024)).toBe('2.0 МБ');
    });

    it('00.3.2#07 should switch from toFixed(1) to integer at 10', () => {
        expect(String_Format_Size.format(9 * 1024)).toBe('9.0 КБ');
        expect(String_Format_Size.format(10 * 1024)).toBe('10 КБ');
        expect(String_Format_Size.format(15 * 1024)).toBe('15 КБ');
    });

    it('00.3.2#08 should saturate at last unit (no further scaling)', () => {
        expect(String_Format_Size.format(1024 * 1024 * 1024)).toBe('1024 МБ');
    });

    it('00.3.2#09 should propagate Infinity through last unit', () => {
        expect(String_Format_Size.format(Infinity)).toBe('Infinity МБ');
    });
});

describe('String_Format_Size.format (bracket)', () => {
    it('00.3.2#10 should wrap zero as " (0 Б)"', () => {
        expect(String_Format_Size.format(0, { formatted: 'bracket' })).toBe(' (0 Б)');
    });

    it('00.3.2#11 should wrap non-zero with leading space', () => {
        expect(String_Format_Size.format(2048, { formatted: 'bracket' })).toBe(' (2.0 КБ)');
    });
});

describe('String_Format_Size.format (custom units)', () => {
    it('00.3.2#12 should respect custom ascending units', () => {
        expect(String_Format_Size.format(1536, { units: ['B', 'KiB'] })).toBe('1.5 KiB');
    });

    it('00.3.2#13 should respect single-unit array (no scaling)', () => {
        expect(String_Format_Size.format(5000, { units: ['B'] })).toBe('5000 B');
    });
});

describe('String_Format_Size.format consumer parity', () => {
    it('00.3.2#14 (+9) should match server contexts.writer bracket form', () => {
        // Фиксируем старый server-контракт до удаления локальной копии.
        expect(String_Format_Size.format(1024, { formatted: 'bracket' })).toBe(' (1.0 КБ)');
        expect(String_Format_Size.format(0, { formatted: 'bracket' })).toBe(' (0 Б)');
        expect(String_Format_Size.format(1536, { formatted: 'bracket' })).toBe(' (1.5 КБ)');
    });

    it('00.3.2#15 (+34) should stay equivalent to context-search.client.js legacy formatSize', () => {
        const legacyPath = path.join(
            __dirname,
            '../../contexts/context-search.client.js',
        );
        const src = fs.readFileSync(legacyPath, 'utf8');
        const legacy = extractFunction(src, 'formatSize');

        const samples: number[] = [
            0,
            1,
            999,
            1023,
            1024,
            1536,
            9 * 1024,
            10 * 1024,
            15 * 1024,
            1024 * 1024,
            1024 * 1024 * 1024,
        ];

        for (const n of samples) {
            expect(String_Format_Size.format(n, { formatted: 'plain' })).toBe(legacy(n));
        }
    });
});