import { describe, expect, it } from '@jest/globals';
import { injectAbbrTitlesIntoHtml } from './abbrs.injector.js';

function dict(entries: Array<[string, string]>): Map<string, any> {
    const m = new Map<string, any>();
    for (const [abbr, full] of entries) {
        m.set(abbr, { abbr, full, category: undefined, description: undefined });
    }
    return m;
}

describe('abbrs.injector.injectAbbrTitlesIntoHtml', () => {
    it('00.5.4#06 (+3) should wrap defined <abbr> with tooltip and add occurrence id', () => {
        const html = '<p><abbr>GOST</abbr></p>';
        const r = injectAbbrTitlesIntoHtml(html, dict([['GOST', 'State standard']]), 'ru');
        expect(r.replaced).toBe(1);
        expect(r.unmatched).toBe(0);
        expect(r.html).toContain('dl-abbr');
        expect(r.html).toContain('abbr-gost-1');
        expect(r.html).not.toContain('<abbr>GOST</abbr>');
    });
    
    it('00.5.4#06b (+3) should produce id/anchor prefixes matching abbrs.model.js', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const abbrsModel = require('./abbrs.model');

        const r = injectAbbrTitlesIntoHtml(
            '<abbr>GOST</abbr>',
            dict([['GOST', 'State standard']]),
            'ru',
        );

        expect(r.html).toContain(`id="${abbrsModel.abbrOccurrenceId('GOST', 1)}"`);
        expect(r.html).toContain(`#${abbrsModel.abbrAnchorId('GOST')}"`);
    });
    it('00.5.4#06b (+3) should produce id/anchor prefixes matching abbrs.model.js', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const abbrsModel = require('./abbrs.model');
        const r = injectAbbrTitlesIntoHtml('<abbr>API</abbr>', dict([['API', 'D']]), 'ru');
        expect(r.html).toContain(`id="${abbrsModel.abbrOccurrenceId('API', 1)}"`);
        expect(r.html).toContain(`#${abbrsModel.abbrAnchorId('API')}"`);
    });

    it('00.5.4#07 (+3) should mark undefined <abbr> as unmatched', () => {
        const html = '<p><abbr>NOPE</abbr></p>';
        const r = injectAbbrTitlesIntoHtml(html, dict([]), 'ru');
        expect(r.replaced).toBe(0);
        expect(r.unmatched).toBe(1);
        expect(r.unmatchedSet.has('NOPE')).toBe(true);
    });

    it('00.5.4#08 (+3, +5) should skip <abbr class="term"> untouched', () => {
        const html = '<abbr class="term">API</abbr> <abbr>GOST</abbr>';
        const r = injectAbbrTitlesIntoHtml(
            html,
            dict([['GOST', 'State standard'], ['API', 'Interface']]),
            'ru',
        );
        expect(r.replaced).toBe(1);
        expect(r.html).toContain('<abbr class="term">API</abbr>');
    });

    it('00.5.4#09 (+3) should not touch <abbr> inside <code>', () => {
        const html = '<code><abbr>GOST</abbr></code>';
        const r = injectAbbrTitlesIntoHtml(html, dict([['GOST', 'State standard']]), 'ru');
        expect(r.replaced).toBe(0);
        expect(r.html).toContain('<code><abbr>GOST</abbr></code>');
    });

    it('00.5.4#10 (+3) should honor data-abbr as canonical lookup key while preserving visible text', () => {
        const html = '<abbr data-abbr="GOST">ГОСТ</abbr>';
        const r = injectAbbrTitlesIntoHtml(html, dict([['GOST', 'State standard']]), 'ru');

        // 1-2. lookup прошёл по canonical, не по visible
        expect(r.replaced).toBe(1);
        expect(r.unmatched).toBe(0);

        // 3. видимый текст сохранён (главная фича data-abbr)
        expect(r.html).toContain('>ГОСТ</abbr>');

        // 4. id/anchor построены из canonical 'GOST', не из 'ГОСТ'
        expect(r.html).toContain('id="abbr-gost-1"');
        expect(r.html).toContain('#abbr-gost"');

        // 5. data-abbr сохранён для повторного прогона инжектора
        expect(r.html).toContain('data-abbr="GOST"');

        // 6. tooltip-содержимое тоже из canonical
        expect(r.html).toContain('<strong>GOST</strong>');
        expect(r.html).toContain('State standard');
    });
});