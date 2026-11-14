// src/contrib/config/constants.test.ts

import { describe, expect, it } from '@jest/globals';
import {
    WHEN, GROUP, GROUP_ORDER, SUBMENU, MENU,
    buildGroup, type WhenCondition,
} from './constants.ts';

describe('WHEN — константы', () => {
    it('00.10.2#01 непустой, все значения — строки', () => {
        const keys = Object.keys(WHEN);
        expect(keys.length).toBeGreaterThan(0);
        for (const k of keys) {
            const v = (WHEN as Record<string, unknown>)[k];
            expect(typeof v).toBe('string');
            expect((v as string).trim().length).toBeGreaterThan(0);
        }
    });

    it('00.10.2#02 EDITOR_LANG_YAML_AND_SELECTION — yaml + selection', () => {
        expect(WHEN.EDITOR_LANG_YAML_AND_SELECTION).toBe(
            '(editorLangId == yaml && editorHasSelection)',
        );
    });

    it('00.10.2#03 KEYBINDING_YAML_FORMAT — без скобок, для keybindings.when', () => {
        // keybindings.when не требует скобок (это не вложенное выражение)
        expect(WHEN.KEYBINDING_YAML_FORMAT).toBe(
            'editorTextFocus && editorLangId == yaml && editorHasSelection',
        );
    });

    it('00.10.2#04 WhenCondition — подмножество string (compile-only проверка)', () => {
        const x: WhenCondition = WHEN.EDITOR_LANG_YAML_AND_SELECTION;
        expect(typeof x).toBe('string');
    });
});

describe('GROUP / GROUP_ORDER / SUBMENU / MENU — структура', () => {
    it('00.10.2#10 GROUP_ORDER — числа, уникальные', () => {
        const vals = Object.values(GROUP_ORDER);
        expect(new Set(vals).size).toBe(vals.length);
        for (const v of vals) expect(typeof v).toBe('number');
    });

    it('00.10.2#11 SUBMENU — id с префиксом diplodoc.', () => {
        for (const v of Object.values(SUBMENU)) {
            expect(v.startsWith('diplodoc.')).toBe(true);
            expect(v.endsWith('.menu')).toBe(true);
        }
    });

    it('00.10.2#12 MENU — два корневых меню', () => {
        expect(MENU.EDITOR_CONTEXT).toBe('editor/context');
        expect(MENU.EXPLORER_CONTEXT).toBe('explorer/context');
    });
});

describe('buildGroup', () => {
    it('00.10.2#20 без префикса', () => {
        expect(buildGroup({ order: 7, group: GROUP.DIPLODOC_SECTION, itemOrder: 9 })).toBe(
            '7.diplodoc.section@9',
        );
    });

    it('00.10.2#21 с префиксом z (после separator)', () => {
        expect(buildGroup({ prefix: 'z', order: 7, group: GROUP.DIPLODOC_SECTION, itemOrder: 5 })).toBe(
            'z7.diplodoc.section@5',
        );
    });

    it('00.10.2#22 с префиксом 0 (до separator)', () => {
        expect(buildGroup({ prefix: '0', order: 8, group: GROUP.DIPLODOC_MENU, itemOrder: 1 })).toBe(
            '08.diplodoc.menu@1',
        );
    });

    it('00.10.2#23 отрицательный itemOrder — не падает (границы VS Code не проверяем)', () => {
        expect(buildGroup({ order: 1, group: GROUP.DIPLODOC_SECTION, itemOrder: -1 })).toBe(
            '1.diplodoc.section@-1',
        );
    });
});

describe('buildGroup frozen snapshot', () => {
    const cases: ReadonlyArray<readonly [Parameters<typeof buildGroup>[0], string]> = [
        [{ order: 1, group: GROUP.DIPLODOC_SECTION, itemOrder: 1 }, '1.diplodoc.section@1'],
        [{ order: 1, group: GROUP.DIPLODOC_SECTION, itemOrder: 5 }, '1.diplodoc.section@5'],
        [{ prefix: 'z', order: 1, group: GROUP.DIPLODOC_SECTION, itemOrder: 5 }, 'z1.diplodoc.section@5'],
        [{ prefix: '0', order: 8, group: GROUP.DIPLODOC_MENU, itemOrder: 1 }, '08.diplodoc.menu@1'],
        [{ order: 99, group: GROUP.DIPLODOC_SECTION, itemOrder: 5 }, '99.diplodoc.section@5'],
    ];
    it('00.10.2#90 should keep frozen group strings', () => {
        for (const [parts, expected] of cases) {
            expect(buildGroup(parts)).toBe(expected);
        }
    });
});