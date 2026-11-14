// src/contrib/menus.test.ts

import { describe, expect, it } from '@jest/globals';
import { COMMANDS } from './commands.ts';
import { MENUS } from './menus.ts';
import { SUBMENU } from './constants.ts';

const commandIds = new Set(COMMANDS.map(c => c.id));

describe('MENUS — структура', () => {
    it('00.10.4#01 ровно 2 root-меню (editor/context, explorer/context)', () => {
        const rootIds = MENUS.filter(m => !m.label).map(m => m.id);
        expect(rootIds.sort()).toEqual(['editor/context', 'explorer/context']);
    });

    it('00.10.4#02 все submenu из SUBMENU присутствуют', () => {
        const menuIds = new Set(MENUS.map(m => m.id));
        for (const subId of Object.values(SUBMENU)) {
            expect(menuIds.has(subId)).toBe(true);
        }
    });

    it('00.10.4#03 id меню уникальны', () => {
        const ids = MENUS.map(m => m.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('00.10.4#04 каждый пункт — либо command, либо submenu (ровно одно)', () => {
        for (const menu of MENUS) {
            for (const item of menu.items) {
                const hasCmd = typeof item.command === 'string';
                const hasSub = typeof item.submenu === 'string';
                expect(hasCmd !== hasSub).toBe(true);
            }
        }
    });

    it('00.10.4#05 каждый command-id в меню существует в COMMANDS', () => {
        const unknown: string[] = [];
        for (const menu of MENUS) {
            for (const item of menu.items) {
                if (item.command && !commandIds.has(item.command)) {
                    unknown.push(item.command);
                }
            }
        }
        expect(unknown).toEqual([]);
    });

    it('00.10.4#06 каждый submenu-id в меню существует в MENUS', () => {
        const menuIds = new Set(MENUS.map(m => m.id));
        const unknown: string[] = [];
        for (const menu of MENUS) {
            for (const item of menu.items) {
                if (item.submenu && !menuIds.has(item.submenu)) {
                    unknown.push(item.submenu);
                }
            }
        }
        expect(unknown).toEqual([]);
    });

    it('00.10.4#07 group — строка, непустая, есть @', () => {
        for (const menu of MENUS) {
            for (const item of menu.items) {
                expect(item.group).toMatch(/^[a-z0-9]*\d+\.[a-z.]*@-?\d+$/);
            }
        }
    });

    it('00.10.4#08 yaml.format присутствует в editor menu', () => {
        const editor = MENUS.find(m => m.id === SUBMENU.EDITOR)!;
        const item = editor.items.find(i => i.command === 'diplodoc-helper.yaml.format');
        expect(item).toBeDefined();
        expect(item!.when).toContain('yaml');
        expect(item!.when).toContain('editorHasSelection');
    });
});

describe('MENUS frozen snapshot (счётчики)', () => {
    it('00.10.4#90 should keep frozen counts', () => {
        const counts = Object.fromEntries(
            MENUS.map(m => [m.id, m.items.length]),
        );
        expect(counts).toEqual({
            'editor/context': 1,
            'explorer/context': 1,
            'diplodoc.explorer.context.menu': 8,
            'diplodoc.editor.context.menu': 10,   // 9 обычных + settings в конце
            'diplodoc.other.explorer.context.menu': 6,
            'diplodoc.helptag.explorer.context.menu': 3,
            'diplodoc.lint.explorer.context.menu': 4,
            'diplodoc.context.explorer.context.menu': 3,
            'diplodoc.reindexier.explorer.context.menu': 3,
            'diplodoc.breadcrumbs.explorer.context.menu': 1,
            'diplodoc.debug.explorer.context.menu': 1,
            'diplodoc.abbrs.explorer.context.menu': 1,
            'diplodoc.terms.explorer.context.menu': 1,
        });
    });
});