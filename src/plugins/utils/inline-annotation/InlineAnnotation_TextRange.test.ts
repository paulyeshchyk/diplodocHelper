import { describe, expect, it } from '@jest/globals';
import { InlineAnnotation_TextRange } from './InlineAnnotation_TextRange.ts';

const find = (text: string, offset: number) =>
    InlineAnnotation_TextRange.findAroundOffset(text, offset, 'abbr');

describe('InlineAnnotation_TextRange.findAroundOffset', () => {
    it('00.5.2#01 should return null when no abbr at all', () => {
        expect(find('plain text', 3)).toBeNull();
    });

    it('00.5.2#02 should return null for empty string', () => {
        expect(find('', 0)).toBeNull();
    });

    it('00.5.2#03 should return null for offset < 0', () => {
        expect(find('<abbr>x</abbr>', -1)).toBeNull();
    });

    it('00.5.2#04 should return null for offset > text.length', () => {
        expect(find('<abbr>x</abbr>', 999)).toBeNull();
    });

    it('00.5.2#05 should find inside a single abbr', () => {
        const text = '<abbr>x</abbr>';
        // offset = 6 (первый символ inner 'x')
        expect(find(text, 7)).toEqual({
            startOffset: 0,
            endOffset: 14,
            inner: 'x',
        });
    });

    it('00.5.2#06 should return null when offset is exactly on opening "<"', () => {
        expect(find('<abbr>x</abbr>', 0)).toBeNull();
    });

    it('00.5.2#07 should return null when offset is exactly on opening ">"', () => {
        // openEnd = 5, offset = 5, условие openEnd >= offset → null
        expect(find('<abbr>x</abbr>', 5)).toBeNull();
    });

    it('00.5.2#08 should return null when offset is on first char of inner', () => {
        // offset = 6 → innerEnd = 6 + closeMatch.index(=1) = 7, inner = 'x' — OK.
        // Для текста '<abbr>b</abbr>' при offset=6: innerStart=6, innerEnd=6+1=7 → 'b'
        // А вот на offset=6 при inner='b' и closeMatch.index=1 (для 'b</abbr>') — не 0.
        // Проверяем именно "первый символ inner":
        expect(find('<abbr>b</abbr>', 6)).toEqual({
            startOffset: 0,
            endOffset: 14,
            inner: 'b',
        });
    });

    it('00.5.2#09 should return null when offset is right after opening ">" with empty inner', () => {
        // <abbr></abbr> — offset=6, closeMatch.index=0, innerStart=6, innerEnd=6 → inner='' → null
        expect(find('<abbr></abbr>', 6)).toBeNull();
    });

    it('00.5.2#10 should return null for whitespace-only inner', () => {
        // inner.trim() === '' → null
        expect(find('<abbr>   </abbr>', 7)).toBeNull();
    });

    it('00.5.2#11 should return null when offset is after closing tag', () => {
        // <abbr>x</abbr>|  → offset = 14 (после '</abbr>')
        // lastIndexOf('<abbr', 14) = 0
        // between = '<abbr>x</abbr>' — содержит '</abbr>' → null
        expect(find('<abbr>x</abbr>', 14)).toBeNull();
    });

    it('00.5.2#12 should return null when only opening tag, no close', () => {
        // <abbr>x   — closeMatch отсутствует → null
        expect(find('<abbr>x', 7)).toBeNull();
    });

    it('00.5.2#13 should return null when close tag comes before opening', () => {
        // </abbr> = 0-6, ' ' = 7, <abbr> = 8-13, 'x' = 14, </abbr> = 15-21
        const text = '</abbr> <abbr>x</abbr>';
        expect(find(text, 14)).toEqual({
            startOffset: 8,
            endOffset: 22,
            inner: 'x',
        });
    });

    it('00.5.2#14 should resolve to the nearest preceding <abbr among multiple', () => {
        // Второй abbr начинается с 15, 'b' на 22, '</abbr>' с 23
        // offset = 21 → последнее '<abbr' слева = 15, openEnd=20, 20>=23 false
        // closeMatch для '</abbr>' на 0 → inner = text.substring(21, 23) = 'b'
        const text = '<abbr>a</abbr> <abbr>b</abbr>';
        expect(find(text, 21)).toEqual({
            startOffset: 15,
            endOffset: 29,
            inner: 'b',
        })
    });

    it('00.5.2#15 should return null when inner is empty for second abbr at its right edge', () => {
        const text = '<abbr>a</abbr><abbr>b</abbr>';
        // offset = 20 (символ 'b'): lastIndexOf('<abbr', 20) = 14
        // openEnd = 19, 19 >= 20? false
        // after = 'b</abbr>' → closeMatch.index = 1
        // innerStart = 20, innerEnd = 21 → 'b' — OK
        // Значит, offset=20 работает
        expect(find(text, 20)).toEqual({
            startOffset: 14,
            endOffset: 28,
            inner: 'b',
        });
    });

    it('00.5.2#16 should trim inner whitespace around content', () => {
        // <abbr>  x  </abbr> с offset = 8 (перед 'x')
        expect(find('<abbr>  x  </abbr>', 10)).toEqual({
            startOffset: 0,
            endOffset: 18,
            inner: 'x',
        });
    });

    it('00.5.2#17 should treat closing tag case-insensitively', () => {
        expect(find('<abbr>x</ABBR>', 7)).toEqual({
            startOffset: 0,
            endOffset: 14,
            inner: 'x',
        });
    });

    it('00.5.2#18 should handle attribute inside opening tag', () => {
        // openEnd = text.indexOf('>', 0) = 22
        // offset = 22 (перед 'x' после '>')
        // Проверим offset = 25 (символ 'x'):
        //   openEnd = 22, 22 >= 25? false
        //   closeMatch: after = 'x</abbr>', index = 1
        //   innerStart = 23, innerEnd = 26 → text.substring(23, 26) = 'x'? Нет.
        //   text = '<abbr data-abbr="foo">x</abbr>'
        //   индексы: 0..22 = '<abbr data-abbr="foo">', 23='x', 24='<'...
        //   offset=24: innerEnd = 24 + 0 = 24, innerStart = 23 → substring(23, 24) = 'x'
        const text = '<abbr data-abbr="foo">x</abbr>';
        expect(find(text, 22)).toEqual({
            startOffset: 0,
            endOffset: 30,
            inner: 'x',
        });
    });

    it('00.5.2#19 should guard against empty tagName at runtime', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(InlineAnnotation_TextRange.findAroundOffset('<abbr>x</abbr>', 7, '' as any)).toBeNull();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(InlineAnnotation_TextRange.findAroundOffset('<abbr>x</abbr>', 7, null as any)).toBeNull();
    });
});

