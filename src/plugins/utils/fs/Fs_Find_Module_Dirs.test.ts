import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Fs_Find_Module_Dirs } from './Fs_Find_Module_Dirs.ts';

describe('Fs_Find_Module_Dirs.matchModuleDir', () => {
    it('57.7.3#01 should match prefix with latin uppercase suffix', () => {
        expect(Fs_Find_Module_Dirs.matchModuleDir('МодульA', 'Модуль')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('МодульCLI', 'Модуль')).toBe(true);
    });

    it('57.7.3#02 should match bare prefix', () => {
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль', 'Модуль')).toBe(true);
    });

    it('57.7.3#03 should reject lowercase latin suffix', () => {
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модульa', 'Модуль')).toBe(false);
    });

    it('57.7.3#04 should reject prefix not at start', () => {
        expect(Fs_Find_Module_Dirs.matchModuleDir('NotAModule', 'Модуль')).toBe(false);
        expect(Fs_Find_Module_Dirs.matchModuleDir('ABМодуль', 'Модуль')).toBe(false);
    });

    it('57.7.3#05 should accept cyrillic uppercase after prefix', () => {
        expect(Fs_Find_Module_Dirs.matchModuleDir('МодульАббревиатуры', 'Модуль')).toBe(true);
    });

    it('57.7.3#06 should accept space/digit/underscore/dash/dot after prefix', () => {
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль 1', 'Модуль')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль_', 'Модуль')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль-X', 'Модуль')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль.X', 'Модуль')).toBe(true);
        // не входят: скобки, слэш
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль(a)', 'Модуль')).toBe(false);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модуль/x', 'Модуль')).toBe(false);
    });
});

describe('Fs_Find_Module_Dirs.findSync', () => {
    let root: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'find-module-dirs-'));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    function mkModule(relPath: string): void {
        const full = path.join(root, relPath);
        fs.mkdirSync(full, { recursive: true });
        fs.writeFileSync(path.join(full, 'index.md'), '---\ntitle: X\n---\n', 'utf8');
    }

    function mkDir(relPath: string): void {
        fs.mkdirSync(path.join(root, relPath), { recursive: true });
    }

    it('57.7.3#07 should find modules matching prefix', () => {
        mkModule('МодульA');
        mkModule('МодульB');
        mkDir('NotAModule');

        const r = Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: 'Модуль' });
        expect(r.sort()).toEqual([
            path.join(root, 'МодульA'),
            path.join(root, 'МодульB'),
        ]);
    });

    it('57.7.3#08 should require index.md inside matched dir', () => {
        mkModule('МодульA');
        mkDir('МодульB'); // без index.md
        fs.writeFileSync(path.join(root, 'МодульB', 'other.md'), '', 'utf8');

        const r = Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: 'Модуль' });
        expect(r).toEqual([path.join(root, 'МодульA')]);
    });

    it('57.7.3#09 should skip dirs listed in skipDirNames', () => {
        mkModule('МодульA');
        mkModule('node_modules/МодульX'); // соответствует префиксу, но в skipDirNames

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: 'Модуль',
            skipDirNames: new Set(['node_modules']),
        });
        expect(r).toEqual([path.join(root, 'МодульA')]);
    });

    it('57.7.3#10 should find nested modules', () => {
        mkModule('МодульA');
        mkModule('МодульA/МодульB'); // вложенный модуль

        const r = Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: 'Модуль' });
        expect(r.sort()).toEqual([
            path.join(root, 'МодульA'),
            path.join(root, 'МодульA', 'МодульB'),
        ]);
    });

    it('57.7.3#11 should skip hidden dirs when skipHidden=true', () => {
        mkModule('МодульA');
        mkModule('.hidden/МодульX');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: 'Модуль',
            skipHidden: true,
        });
        expect(r).toEqual([path.join(root, 'МодульA')]);
    });

    it('57.7.3#12 should descend into hidden dirs when skipHidden=false (default)', () => {
        mkModule('.hidden/МодульX');

        const r = Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: 'Модуль' });
        expect(r).toEqual([path.join(root, '.hidden', 'МодульX')]);
    });

    it('57.7.3#13 should skip underscore dirs when skipUnderscore=true', () => {
        mkModule('МодульA');
        mkModule('_generated/МодульX');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: 'Модуль',
            skipUnderscore: true,
        });
        expect(r).toEqual([path.join(root, 'МодульA')]);
    });

    it('57.7.3#14 should skip dirs by absolute path via skipFullPaths', () => {
        mkModule('МодульA');
        mkModule('sub/МодульB');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: 'Модуль',
            skipFullPaths: new Set([path.resolve(root, 'sub')]),
        });
        expect(r).toEqual([path.join(root, 'МодульA')]);
    });

    it('57.7.3#15 should return empty array for empty root', () => {
        expect(
            Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: 'Модуль' }),
        ).toEqual([]);
    });

    it('57.7.3#16 should return empty array for non-existent root', () => {
        expect(
            Fs_Find_Module_Dirs.findSync({
                rootDir: path.join(root, '__does_not_exist__'),
                prefix: 'Модуль',
            }),
        ).toEqual([]);
    });

    it('57.7.3#17 should respect custom indexFileName', () => {
        const dir = path.join(root, 'МодульA');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'page.md'), '', 'utf8');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: 'Модуль',
            indexFileName: 'page.md',
        });
        expect(r).toEqual([path.join(root, 'МодульA')]);
    });
});

describe('Fs_Find_Module_Dirs.findSync — prefix-less + excludeDirs (57.7.3#18..#22)', () => {
    let root: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'find-module-dirs-noprefix-'));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    function mkDir(relPath: string, withIndex = true): void {
        const full = path.join(root, relPath);
        fs.mkdirSync(full, { recursive: true });
        if (withIndex) {
            fs.writeFileSync(path.join(full, 'index.md'), '---\ntitle: X\n---\n', 'utf8');
        }
    }

    it('57.7.3#18 should walk all dirs with index.md when prefix is undefined', () => {
        mkDir('iPhone15Pro');
        mkDir('GalaxyS24');
        mkDir('empty-dir', false);

        const r = Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: undefined });
        expect(r.sort()).toEqual([
            path.join(root, 'GalaxyS24'),
            path.join(root, 'iPhone15Pro'),
        ]);
    });

    it('57.7.3#19 should walk all dirs when prefix is empty string', () => {
        mkDir('iPhone15Pro');
        const r = Fs_Find_Module_Dirs.findSync({ rootDir: root, prefix: '' });
        expect(r).toEqual([path.join(root, 'iPhone15Pro')]);
    });

    it('57.7.3#20 should exclude dirs listed in excludeDirs (relative posix)', () => {
        mkDir('iPhone15Pro');
        mkDir('Manufacturers/Apple');
        mkDir('Categories/Flagship');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: undefined,
            excludeDirs: new Set(['Manufacturers/Apple', 'Categories/Flagship']),
        });
        expect(r).toEqual([path.join(root, 'iPhone15Pro')]);
    });

    it('57.7.3#21 should exclude dirs listed in excludeDirs (absolute path)', () => {
        mkDir('iPhone15Pro');
        mkDir('Manufacturers/Apple');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: undefined,
            excludeDirs: new Set([path.join(root, 'Manufacturers', 'Apple')]),
        });
        expect(r).toEqual([path.join(root, 'iPhone15Pro')]);
    });

    it('57.7.3#22 should still walk into excluded dir subtree if it contains non-excluded dirs', () => {
        // excludeDirs не останавливает рекурсию — только исключает саму папку.
        // Manufacturers/Apple — exclude, но если внутри есть Manufacturer/Apple/sub с index.md, он будет найден.
        mkDir('Manufacturers/Apple');
        mkDir('Manufacturers/Apple/sub');
        mkDir('iPhone15Pro');

        const r = Fs_Find_Module_Dirs.findSync({
            rootDir: root,
            prefix: undefined,
            excludeDirs: new Set(['Manufacturers/Apple']),
        });
        expect(r.sort()).toEqual([
            path.join(root, 'Manufacturers', 'Apple', 'sub'),
            path.join(root, 'iPhone15Pro'),
        ]);
    });

    it('57.7.3#23 should allow any suffix when prefix ends with non-letter (separator rule)', () => {
        // Phone_iPhone15: prefix 'Phone_' оканчивается на '_' → любой суффикс
        expect(Fs_Find_Module_Dirs.matchModuleDir('Phone_iPhone15', 'Phone_')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Phone_GalaxyS24', 'Phone_')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Model-15', 'Model-')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('2024_1', '2024_')).toBe(true);
    });

    it('57.7.3#24 should preserve legacy check when prefix ends with a letter', () => {
        // Регрессия: 'Модуль' оканчивается на 'ь' (буква) → legacy-проверка.
        expect(Fs_Find_Module_Dirs.matchModuleDir('МодульA', 'Модуль')).toBe(true);
        expect(Fs_Find_Module_Dirs.matchModuleDir('Модульa', 'Модуль')).toBe(false);
    });
});