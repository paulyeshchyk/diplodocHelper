import { describe, expect, it } from '@jest/globals';
import { InlineAnnotation_Mask } from './InlineAnnotation_Mask.ts';

describe('InlineAnnotation_Mask.maskCodeInMarkdown', () => {
    it('00.5.1#01 should return input untouched for plain text', () => {
        const src = 'just a text';
        expect(InlineAnnotation_Mask.maskCodeInMarkdown(src)).toBe(src);
    });

    it('00.5.1#02 should mask fenced block with triple backticks', () => {
        const src = 'pre\n```\ncode-inside\n```\npost';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('code-inside');
        expect(out).toContain('pre');
        expect(out).toContain('post');
    });

    it('00.5.1#03 should mask fenced block with triple tildes', () => {
        const src = 'pre\n~~~\ncode-inside\n~~~\npost';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('code-inside');
    });

    it('00.5.1#04 should mask inline single-backtick', () => {
        const src = 'a `x` b';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('`x`');
        expect(out).not.toContain(' x ');
    });

    it('00.5.1#05 should mask inline double-backtick', () => {
        const src = 'a ``x`` b';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('``x``');
    });

    it('00.5.1#06 should mask <code>...</code>', () => {
        const src = 'a <code>x</code> b';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('<code>');
        expect(out).not.toContain('x</code>');
    });

    it('00.5.1#07 should mask <pre>...</pre> including nested <code>', () => {
        const src = 'a <pre>block\n<code>nested</code></pre> b';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('<pre>');
        expect(out).not.toContain('nested');
    });

    it('00.5.1#08 should use distinct placeholders for multiple masks', () => {
        const src = 'a `x` b `y` c';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        const matches = out.match(/\uE000\d+\uE001/g) ?? [];
        expect(matches).toHaveLength(2);
        expect(new Set(matches).size).toBe(2);
    });

    it('00.5.1#09 should mask inline backticks inside fenced block only once', () => {
        // false-negative guard: `bar` внутри fenced не должен остаться на виду
        const src = '```\nfoo `bar` baz\n```';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('`');
        expect(out).not.toContain('bar');
        // Ровно один плейсхолдер на весь блок, не два
        const matches = out.match(/\uE000\d+\uE001/g) ?? [];
        expect(matches).toHaveLength(1);
    });

    it('00.5.1#10 should mask fenced block whose info string looks like inline', () => {
        const src = '```js\nlet x = 1;\n```';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out).not.toContain('let x');
    });

    it('00.5.1#11 should preserve surrounding text around masked regions', () => {
        const src = 'before `code` after';
        const out = InlineAnnotation_Mask.maskCodeInMarkdown(src);
        expect(out.startsWith('before ')).toBe(true);
        expect(out.endsWith(' after')).toBe(true);
    });
});

describe('InlineAnnotation_Mask.maskCodeBlocks', () => {
    it('00.5.1#12 should return identical string when no code tags present', () => {
        const html = 'plain <b>text</b>';
        const { masked, unmask } = InlineAnnotation_Mask.maskCodeBlocks(html);
        expect(masked).toBe(html);
        expect(unmask(masked)).toBe(html);
    });

    it('00.5.1#13 should mask and unmask <code>', () => {
        const html = 'a<code>x</code>b';
        const { masked, unmask } = InlineAnnotation_Mask.maskCodeBlocks(html);
        expect(masked).not.toContain('<code>');
        expect(unmask(masked)).toBe(html);
    });

    it('00.5.1#14 should mask and unmask <pre>', () => {
        const html = 'a<pre>x</pre>b';
        const { masked, unmask } = InlineAnnotation_Mask.maskCodeBlocks(html);
        expect(masked).not.toContain('<pre>');
        expect(unmask(masked)).toBe(html);
    });

    it('00.5.1#15 should use distinct placeholders for multiple blocks', () => {
        const html = '<code>a</code><pre>b</pre>';
        const { masked, unmask } = InlineAnnotation_Mask.maskCodeBlocks(html);
        expect(masked).not.toContain('<code>');
        expect(masked).not.toContain('<pre>');
        expect(unmask(masked)).toBe(html);
    });

    it('00.5.1#16 should be case-insensitive on tag names', () => {
        const html = 'a<CODE>x</CODE>b<PRE>y</PRE>';
        const { masked, unmask } = InlineAnnotation_Mask.maskCodeBlocks(html);
        expect(masked).not.toMatch(/CODE|PRE/i);
        expect(unmask(masked)).toBe(html);
    });
});

