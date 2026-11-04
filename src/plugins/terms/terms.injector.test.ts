import { describe, expect, it } from '@jest/globals';
import { injectTermTitlesIntoHtml } from './terms.injector';

function dict(entries: Array<[string, string]>): Map<string, any> {
    const m = new Map<string, any>();
    for (const [term, definition] of entries) {
        m.set(term, { term, definition, category: undefined, description: undefined });
    }
    return m;
}

describe('terms.injector.injectTermTitlesIntoHtml', () => {
    it('00.5.4#14 (+5) should wrap defined <abbr class="term"> with tooltip', () => {
        const html = '<abbr class="term">API</abbr>';
        const r = injectTermTitlesIntoHtml(
            html,
            dict([['API', 'Application Programming Interface']]),
            'ru',
        );
        expect(r.replaced).toBe(1);
        expect(r.html).toContain('dl-term');
    });

    it('00.5.4#15 (+5, +3) should skip plain <abbr> (not term-markup)', () => {
        const html = '<abbr>GOST</abbr>';
        const r = injectTermTitlesIntoHtml(html, dict([['GOST', 'State standard']]), 'ru');
        expect(r.replaced).toBe(0);
        expect(r.html).toContain('<abbr>GOST</abbr>');
    });

    it('00.5.4#16 (+5) should mark undefined <abbr class="term"> as unmatched', () => {
        const html = '<abbr class="term">NOPE</abbr>';
        const r = injectTermTitlesIntoHtml(html, dict([]), 'ru');
        expect(r.replaced).toBe(0);
        expect(r.unmatched).toBe(1);
        expect(r.unmatchedSet.has('NOPE')).toBe(true);
    });
});