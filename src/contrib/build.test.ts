// src/contrib/build.test.ts

import { describe, expect, it } from '@jest/globals';
import { buildAllHandlers, buildCommandHandlers, buildContributes } from './build.ts';
import type { CommandSpec, KeyBindingSpec, MenuSpec } from './types.ts';

const noop = (): void => { };

const cmd = (id: string, titleKey: string, handler = noop): CommandSpec => ({
    id, titleKey, handler,
});

const menuItem = (spec: Partial<MenuSpec['items'][number]> & { group: string }) => ({
    when: undefined,
    command: undefined,
    submenu: undefined,
    ...spec,
});

describe('buildContributes — basics', () => {
    it('00.10.1#01 пустой вход → commands/submenus/menus пустые, keybindings отсутствует', () => {
        const r = buildContributes([], []);
        expect(r.commands).toEqual([]);
        expect(r.submenus).toEqual([]);
        expect(r.menus).toEqual({});
        expect(r).not.toHaveProperty('keybindings');
    });

    it('00.10.1#02 commands → title оборачивается в %..%', () => {
        const r = buildContributes(
            [cmd('diplodoc-helper.a', 'command.md.a'), cmd('diplodoc-helper.b', 'command.md.b')],
            [],
        );
        expect(r.commands).toEqual([
            { command: 'diplodoc-helper.a', title: '%command.md.a%' },
            { command: 'diplodoc-helper.b', title: '%command.md.b%' },
        ]);
    });

    it('00.10.1#03 submenus — только с label', () => {
        const r = buildContributes([], [
            { id: 'editor/context', items: [] },                          // root, без label
            { id: 'diplodoc.editor.context.menu', label: '%submenu.diplodoc%', items: [] },
        ]);
        expect(r.submenus).toEqual([{ id: 'diplodoc.editor.context.menu', label: '%submenu.diplodoc%' }]);
    });

    it('00.10.1#04 menus — все MenuSpec идут в Record, включая root', () => {
        const item = menuItem({ submenu: 'x', group: '8.diplodoc.menu@1' });
        const r = buildContributes([], [
            { id: 'editor/context', items: [item] },
            { id: 'diplodoc.editor.context.menu', label: '%submenu.diplodoc%', items: [] },
        ]);
        expect(Object.keys(r.menus).sort()).toEqual(['diplodoc.editor.context.menu', 'editor/context']);
        expect(r.menus['editor/context']).toEqual([item]);
    });

    it('00.10.1#05 keybindings — пустые → поле отсутствует (back-compat)', () => {
        const r = buildContributes([], []);
        expect('keybindings' in r).toBe(false);
    });

    it('00.10.1#06 keybindings — непустые → поле есть как есть', () => {
        const kb: KeyBindingSpec[] = [
            { command: 'diplodoc-helper.yaml.format', key: 'ctrl+alt+f', when: WHEN_TEST },
        ];
        const r = buildContributes([], [], kb);
        expect(r.keybindings).toEqual(kb);
    });
});

describe('buildAllHandlers', () => {
    it('00.10.1#22 commands + internal, обе группы в одном объекте', () => {
        const h1 = (): void => { };
        const h2 = (): void => { };
        const r = buildAllHandlers(
            [cmd('a', 'k.a', h1)],
            { 'ux-internal': h2 },
        );
        expect(r.a).toBe(h1);
        expect(r['ux-internal']).toBe(h2);
    });

    it('00.10.1#23 internal перетирает command при коллизии id (edge)', () => {
        const hCmd = (): void => { };
        const hInt = (): void => { };
        const r = buildAllHandlers(
            [cmd('x', 'k.x', hCmd)],
            { x: hInt },
        );
        expect(r.x).toBe(hInt);
    });
});

// тестовая константа, не из WHEN, — чтобы build.test.ts не зависел от constants.ts
const WHEN_TEST = 'editorTextFocus && editorLangId == yaml && editorHasSelection';

describe('buildContributes — invariants', () => {
    it('00.10.1#10 порядок команд сохраняется (не сортируется)', () => {
        const r = buildContributes(
            [cmd('c', 'k.c'), cmd('a', 'k.a'), cmd('b', 'k.b')],
            [],
        );
        expect(r.commands.map(c => c.command)).toEqual(['c', 'a', 'b']);
    });

    it('00.10.1#11 порядок пунктов в меню сохраняется', () => {
        const items = [
            menuItem({ command: 'a', group: '1.g@1' }),
            menuItem({ command: 'b', group: '1.g@2' }),
            menuItem({ command: 'c', group: '1.g@3' }),
        ];
        const r = buildContributes([], [{ id: 'editor/context', items }]);
        expect(r.menus['editor/context'].map(i => i.command)).toEqual(['a', 'b', 'c']);
    });
});

describe('buildCommandHandlers', () => {
    it('00.10.1#20 один handler на команду, identity сохраняется', () => {
        const h1 = (): void => { };
        const h2 = (): void => { };
        const r = buildCommandHandlers([
            cmd('a', 'k.a', h1),
            cmd('b', 'k.b', h2),
        ]);
        expect(r.a).toBe(h1);
        expect(r.b).toBe(h2);
    });

    it('00.10.1#21 пустой вход → {}', () => {
        expect(buildCommandHandlers([])).toEqual({});
    });
});

// === 4. Frozen snapshot (drift-guard) ===
describe('buildContributes frozen snapshot', () => {
    it('00.10.1#90 should keep frozen contribution shape', () => {
        const r = buildContributes(
            [cmd('cmd.a', 'key.a')],
            [
                { id: 'editor/context', items: [menuItem({ submenu: 'sub', group: '8.diplodoc.menu@1' })] },
                { id: 'sub', label: '%submenu.x%', items: [menuItem({ command: 'cmd.a', group: '1.g@1' })] },
            ],
        );
        expect(r).toEqual({
            commands: [{ command: 'cmd.a', title: '%key.a%' }],
            submenus: [{ id: 'sub', label: '%submenu.x%' }],
            menus: {
                'editor/context': [{ submenu: 'sub', group: '8.diplodoc.menu@1' }],
                sub: [{ command: 'cmd.a', group: '1.g@1' }],
            },
        });
    });
});