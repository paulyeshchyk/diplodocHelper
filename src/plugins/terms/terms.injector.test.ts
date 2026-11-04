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
    it('00.5.4#14b (+5) should produce id/anchor prefixes matching terms.model.js', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const termsModel = require('./terms.model');
        const r = injectTermTitlesIntoHtml('<abbr class="term">API</abbr>', dict([['API', 'D']]), 'ru');
        expect(r.html).toContain(`id="${termsModel.termOccurrenceId('API', 1)}"`);
        expect(r.html).toContain(`#${termsModel.termAnchorId('API')}"`);
    });

    it('00.5.4#14b (+5) should produce id/anchor prefixes matching terms.model.js', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const termsModel = require('./terms.model');

        const r = injectTermTitlesIntoHtml(
            '<abbr class="term">API</abbr>',
            dict([['API', 'Application Programming Interface']]),
            'ru',
        );

        expect(r.html).toContain(`id="${termsModel.termOccurrenceId('API', 1)}"`);
        expect(r.html).toContain(`#${termsModel.termAnchorId('API')}"`);

        // guard: ни один из legacy-префиксов не должен появиться
        expect(r.html).not.toMatch(/\bid="abbr-/);
        expect(r.html).not.toMatch(/\bid="terms-/);
        expect(r.html).not.toMatch(/#abbr-api/);
        expect(r.html).not.toMatch(/#terms-api/);
    });

    it('00.5.4#15 (+5, +3) should skip plain <abbr> (not term-markup)', () => {
        const html = '<abbr>GOST</abbr>';
        const r = injectTermTitlesIntoHtml(html, dict([['GOST', 'State standard']]), 'ru');
        expect(r.replaced).toBe(0);
        expect(r.html).toContain('<abbr>GOST</abbr>');
        expect(r.html).toContain('<abbr>GOST</abbr>');
        expect(r.html).not.toContain('id="term-gost');
    });

    it('00.5.4#16 (+5) should mark undefined <abbr class="term"> as unmatched', () => {
        const html = '<abbr class="term">NOPE</abbr>';
        const r = injectTermTitlesIntoHtml(html, dict([]), 'ru');
        expect(r.replaced).toBe(0);
        expect(r.unmatched).toBe(1);
        expect(r.unmatchedSet.has('NOPE')).toBe(true);
    });
});