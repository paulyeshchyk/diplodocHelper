import { describe, expect, it } from '@jest/globals';
import { QuickPick_Build_DictionaryItems } from './QuickPick_Build_DictionaryItems.ts';

const entries = [
    { key: 'API', description: 'Application Programming Interface', category: 'standards' },
    { key: 'GOST', description: 'State standard' },
];
const opts = {
    removeMarkupLabel: 'Снять разметку',
    createLabel: (q: string) => `Создать «${q}»`,
};

describe('QuickPick_Build_DictionaryItems.build', () => {
    it('00.12.1#01 пустой query, не обёрнуто → все entries, без create', () => {
        const r = QuickPick_Build_DictionaryItems.build({ entries, query: '', alreadyWrapped: false, ...opts });
        expect(r.map(i => i.label)).toEqual(['API', 'GOST']);
        expect(r.some(i => i.action === 'create')).toBe(false);
    });

    it('00.12.1#02 query "NEW" → matched пусто + create с alwaysShow', () => {
        const r = QuickPick_Build_DictionaryItems.build({ entries, query: 'NEW', alreadyWrapped: false, ...opts });
        expect(r.map(i => i.action)).toEqual(['create']);
        expect(r[0].alwaysShow).toBe(true);
        expect(r[0].query).toBe('NEW');
    });

    it('00.12.1#03 exact match "API" → API первым, без create', () => {
        const r = QuickPick_Build_DictionaryItems.build({ entries, query: 'API', alreadyWrapped: false, ...opts });
        expect(r[0].label).toBe('API');
        expect(r.some(i => i.action === 'create')).toBe(false);
    });

    it('00.12.1#04 уже обёрнуто + query → removeMarkup сверху + matched + create', () => {
        const r = QuickPick_Build_DictionaryItems.build({ entries, query: 'X', alreadyWrapped: true, ...opts });
        expect(r[0].action).toBe('removeMarkup');
        expect(r[r.length - 1].action).toBe('create');
    });

    it('00.12.1#05 match по description ("Programming") → API в matched', () => {
        const r = QuickPick_Build_DictionaryItems.build({ entries, query: 'Programming', alreadyWrapped: false, ...opts });
        expect(r.some(i => i.label === 'API')).toBe(true);
    });
});