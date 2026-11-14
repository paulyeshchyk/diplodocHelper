// src/contrib/commands.test.ts

import { describe, expect, it } from '@jest/globals';
import { COMMANDS } from './commands.ts';

describe('COMMANDS — структура', () => {
    it('00.10.3#01 непустой, ≥36 команд', () => {
        expect(COMMANDS.length).toBeGreaterThanOrEqual(36);
    });

    it('00.10.3#02 id уникальны', () => {
        const ids = COMMANDS.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('00.10.3#03 id начинаются с diplodoc-helper.', () => {
        for (const c of COMMANDS) {
            expect(c.id.startsWith('diplodoc-helper.')).toBe(true);
        }
    });

    it('00.10.3#04 titleKey или title — ровно одно, непустое', () => {
        for (const c of COMMANDS) {
            const hasKey = typeof c.titleKey === 'string' && c.titleKey.trim().length > 0;
            const hasTitle = typeof c.title === 'string' && c.title.trim().length > 0;
            const exactlyOne = (hasKey ? 1 : 0) + (hasTitle ? 1 : 0);
            if (exactlyOne !== 1) {
                throw new Error(
                    `CommandSpec "${c.id}": expected exactly one of titleKey/title (non-empty), ` +
                    `got titleKey=${JSON.stringify(c.titleKey)}, title=${JSON.stringify(c.title)}`,
                );
            }
        }
        expect(true).toBe(true);   // smoke: цикл выше не бросил
    });

    it('00.10.3#05 handler — функция, доступ без invoke', () => {
        for (const c of COMMANDS) {
            expect(typeof c.handler).toBe('function');
        }
    });

    it('00.10.3#06 yaml.format зарегистрирован', () => {
        const spec = COMMANDS.find(c => c.id === 'diplodoc-helper.yaml.format');
        expect(spec).toBeDefined();
        expect(spec!.titleKey).toBe('command.md.format');
    });

    it('00.10.3#07 никаких дублей id vs titleKey (кроме обоснованных)', () => {
        // каждая команда имеет свой titleKey, кроме тех, у кого ключ-заглушка = id
        const keys = COMMANDS.map(c => c.titleKey);
        const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
        // допустимые: 'diplodoc-helper.generateContextmap' (raw title)
        for (const k of dupKeys) expect(k).toMatch(/^diplodoc-helper\./);
    });
});

describe('COMMANDS frozen snapshot (ids)', () => {
    it('00.10.3#90 should keep frozen command ids', () => {
        const ids = COMMANDS.map(c => c.id).sort();
        expect(ids).toEqual([
            'diplodoc-helper.abbr.Add',
            'diplodoc-helper.context.Delete',
            'diplodoc-helper.context.Update',
            'diplodoc-helper.copyLink',
            'diplodoc-helper.createSection',
            'diplodoc-helper.deleteSection',
            'diplodoc-helper.file.delete',
            'diplodoc-helper.footnote.add',
            'diplodoc-helper.generateAbbrs',
            'diplodoc-helper.generateBreadcrumbs',
            'diplodoc-helper.generateContextmap',
            'diplodoc-helper.generateContexts',
            'diplodoc-helper.generateHelpMaps',
            'diplodoc-helper.generateTerms',
            'diplodoc-helper.gost.Add',
            'diplodoc-helper.gost.Insert',
            'diplodoc-helper.helptag.Delete',
            'diplodoc-helper.helptag.Update',
            'diplodoc-helper.installScripts',
            'diplodoc-helper.linter.abbrs',
            'diplodoc-helper.linter.links',
            'diplodoc-helper.linter.terms',
            'diplodoc-helper.link.addAnchor',
            'diplodoc-helper.moveSection',
            'diplodoc-helper.pasteImageFromClipboard',
            'diplodoc-helper.pasteImageFromList',
            'diplodoc-helper.pasteLink',
            'diplodoc-helper.reindexDirectories',
            'diplodoc-helper.reindexFigures',
            'diplodoc-helper.reindexFootnotes',
            'diplodoc-helper.renameSection',
            'diplodoc-helper.settings',
            'diplodoc-helper.smart.delete',
            'diplodoc-helper.term.Add',
            'diplodoc-helper.wipeEmptyDirectories',
            'diplodoc-helper.yaml.format',
        ].sort());
    });
});