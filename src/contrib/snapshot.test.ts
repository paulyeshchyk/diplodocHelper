// src/contrib/snapshot.test.ts

import { describe, expect, it } from '@jest/globals';
import pkg from '../../package.json';
import enJson from '../../package.nls.json';
import ruJson from '../../package.nls.ru.json';
import { COMMANDS, MENUS, KEYBINDINGS } from './index.ts';
import { buildContributes } from './build.ts';

type PkgMenuItem = { command?: string; submenu?: string; when?: string; group: string };
type PkgContributes = {
    commands: Array<{ command: string; title: string }>;
    submenus: Array<{ id: string; label: string }>;
    menus: Record<string, PkgMenuItem[]>;
    keybindings?: Array<{ command: string; key: string; when?: string }>;
};

const actual = buildContributes(COMMANDS, MENUS, KEYBINDINGS);
const expected = pkg.contributes as PkgContributes;

/**
 * Известные расхождения (миграция в рамках шага 6).
 * Шаг 7 применит эти diff'ы к package.json → массив станет пустым.
 */
const ALLOWED_DIFFS: ReadonlyArray<string> = [];

function indexItems(items: ReadonlyArray<PkgMenuItem>): Map<string, PkgMenuItem> {
    const out = new Map<string, PkgMenuItem>();
    for (const item of items) {
        const key = item.command ?? `sub:${item.submenu}`;
        out.set(key, item);
    }
    return out;
}

describe('snapshot vs package.json#contributes', () => {
    it('00.10.6#01 commands: одинаковый набор id', () => {
        expect(actual.commands.map(c => c.command).sort()).toEqual(
            expected.commands.map(c => c.command).sort(),
        );
    });

    it('00.10.6#02 commands: title диффы = ALLOWED_DIFFS, %key% резолвятся', () => {
        const expMap = new Map(expected.commands.map(c => [c.command, c.title]));
        const diffs: string[] = [];

        for (const c of actual.commands) {
            const exp = expMap.get(c.command);
            if (exp !== c.title) {
                diffs.push(`${c.command}: "${exp ?? '(missing)'}" → "${c.title}"`);
                continue;
            }
            // каждый %key% должен быть в обоих nls-файлах
            const m = c.title.match(/^%(.+)%$/);
            if (m) {
                const key = m[1];
                if (!(key in enJson)) diffs.push(`${c.command}: ключ "${key}" нет в package.nls.json`);
                if (!(key in ruJson)) diffs.push(`${c.command}: ключ "${key}" нет в package.nls.ru.json`);
            }
        }

        expect(diffs.sort()).toEqual([...ALLOWED_DIFFS].sort());
    });

    it('00.10.6#03 submenus: одинаковый набор {id, label}', () => {
        const actualSet = new Set(actual.submenus.map(s => `${s.id}|${s.label}`));
        const expSet = new Set(expected.submenus.map(s => `${s.id}|${s.label}`));
        expect([...actualSet].sort()).toEqual([...expSet].sort());
    });

    it('00.10.6#04 menus: одинаковый набор id', () => {
        expect(Object.keys(actual.menus).sort()).toEqual(Object.keys(expected.menus).sort());
    });

    it('00.10.6#05 menus: пункты совпадают (по command/submenu)', () => {
        const diffs: string[] = [];
        for (const menuId of Object.keys(actual.menus)) {
            const actIdx = indexItems(actual.menus[menuId]);
            const expIdx = indexItems(expected.menus[menuId] ?? []);

            for (const [key, act] of actIdx) {
                const exp = expIdx.get(key);
                if (!exp) {
                    diffs.push(`${menuId}: лишний пункт "${key}"`);
                    continue;
                }
                if (exp.group !== act.group) {
                    diffs.push(`${menuId}/${key}: group "${exp.group}" → "${act.group}"`);
                }
                if ((exp.when ?? '') !== (act.when ?? '')) {
                    diffs.push(`${menuId}/${key}: when "${exp.when ?? ''}" → "${act.when ?? ''}"`);
                }
            }
            for (const [key] of expIdx) {
                if (!actIdx.has(key)) diffs.push(`${menuId}: пропал пункт "${key}"`);
            }
        }
        expect(diffs).toEqual([]);
    });

    it('00.10.6#06 keybindings: совпадают (сейчас пусто)', () => {
        expect(actual.keybindings ?? []).toEqual(expected.keybindings ?? []);
    });

    it('00.10.6#07 каждый CommandSpec имеет ровно одно из titleKey/title', () => {
        const bad: string[] = [];
        for (const c of COMMANDS) {
            const hasKey = typeof c.titleKey === 'string';
            const hasTitle = typeof c.title === 'string';
            if (hasKey === hasTitle) bad.push(c.id);   // оба false (ничего) или оба true (конфликт)
        }
        expect(bad).toEqual([]);
    });
});