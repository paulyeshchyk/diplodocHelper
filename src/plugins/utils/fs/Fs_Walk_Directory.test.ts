import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Fs_Walk_Directory } from './Fs_Walk_Directory.ts';

let root: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-test-'));
    fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
    fs.mkdirSync(path.join(root, '.hidden'), { recursive: true });
    fs.mkdirSync(path.join(root, '_assets'), { recursive: true });
    fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(root, 'a.md'), '');
    fs.writeFileSync(path.join(root, 'b.html'), '');
    fs.writeFileSync(path.join(root, 'sub', 'c.md'), '');
    fs.writeFileSync(path.join(root, 'sub', 'd.html'), '');
    fs.writeFileSync(path.join(root, '.hidden', 'e.md'), '');
    fs.writeFileSync(path.join(root, '_assets', 'f.md'), '');
    fs.writeFileSync(path.join(root, 'node_modules', 'g.md'), '');
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe('Fs_Walk_Directory.walkSync', () => {
    it('00.4.2#01 should visit every non-hidden file by default', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({ dir: root, onFile: p => seen.push(p) });
        expect(seen.sort()).toEqual(
            [
                path.join(root, 'a.md'),
                path.join(root, 'b.html'),
                path.join(root, 'sub', 'c.md'),
                path.join(root, 'sub', 'd.html'),
                path.join(root, '_assets', 'f.md'),
                path.join(root, 'node_modules', 'g.md'),
            ].sort(),
        );
    });

    it('00.4.2#02 should respect filterFile', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: root,
            filterFile: p => p.endsWith('.html'),
            onFile: p => seen.push(p),
        });
        expect(seen.sort()).toEqual(
            [path.join(root, 'b.html'), path.join(root, 'sub', 'd.html')].sort(),
        );
    });

    it('00.4.2#03 should skip hidden dirs when skipHidden defaults to true', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({ dir: root, onFile: p => seen.push(p) });
        expect(seen).not.toContain(path.join(root, '.hidden', 'e.md'));
    });

    it('00.4.2#04 should descend into hidden dirs when skipHidden is false', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: root,
            skipHidden: false,
            onFile: p => seen.push(p),
        });
        expect(seen).toContain(path.join(root, '.hidden', 'e.md'));
    });

    it('00.4.2#05 should skip underscore dirs when skipUnderscore is true', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: root,
            skipUnderscore: true,
            onFile: p => seen.push(p),
        });
        expect(seen).not.toContain(path.join(root, '_assets', 'f.md'));
    });

    it('00.4.2#06 should skip dirs by basename via skipDirNames', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: root,
            skipDirNames: new Set(['node_modules', 'sub']),
            onFile: p => seen.push(p),
        });
        expect(seen).not.toContain(path.join(root, 'node_modules', 'g.md'));
        expect(seen).not.toContain(path.join(root, 'sub', 'c.md'));
        expect(seen).toContain(path.join(root, 'a.md'));
    });

    it('00.4.2#07 should skip dirs by absolute path via skipFullPaths', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: root,
            skipFullPaths: new Set([path.resolve(root, 'sub')]),
            onFile: p => seen.push(p),
        });
        expect(seen).not.toContain(path.join(root, 'sub', 'c.md'));
        expect(seen).toContain(path.join(root, 'a.md'));
    });

    it('00.4.2#08 should be a no-op for non-existent directory', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: path.join(root, '__does_not_exist__'),
            onFile: p => seen.push(p),
        });
        expect(seen).toEqual([]);
    });

    it('00.4.2#09 should combine filter + skip flags orthogonally', () => {
        const seen: string[] = [];
        Fs_Walk_Directory.walkSync({
            dir: root,
            skipUnderscore: true,
            skipDirNames: new Set(['node_modules']),
            filterFile: p => p.endsWith('.md'),
            onFile: p => seen.push(p),
        });
        expect(seen.sort()).toEqual(
            [path.join(root, 'a.md'), path.join(root, 'sub', 'c.md')].sort(),
        );
    });
});

describe('Fs_Walk_Directory.collectFiles', () => {
    it('00.4.2#10 should return array of files', () => {
        const files = Fs_Walk_Directory.collectFiles({ dir: root });
        expect(files).toContain(path.join(root, 'a.md'));
        expect(files.length).toBeGreaterThan(0);
    });

    it('00.4.2#11 should return empty array for non-existent directory', () => {
        const files = Fs_Walk_Directory.collectFiles({
            dir: path.join(root, '__nope__'),
        });
        expect(files).toEqual([]);
    });
});

/**
 * Backward-compat shim: `plugins/utils/walk.js` и `plugins/utils/html.utils.js`.
 * Smoke-тесты — убедиться, что старые `require()` работают после замены на TS.
 * Полные регрессии — по консумерам:
 *   walk.js  → breadcrumb.collector (1), comments.injector (51),
 *              context-tags (45), feature-map.injector (57)
 *   html.utils → те же (1, 51, 45, 57)
 */
describe('shim: plugins/utils/walk.js (+1)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { walk } = require('../walk');

    it('00.4.2#12 (+1) should preserve legacy walk semantics (skipHidden=false)', () => {
        const seen: string[] = [];
        walk(root, () => true, (p: string) => seen.push(p));
        // legacy walk не пропускал hidden — .hidden/e.md должен попасть
        expect(seen).toContain(path.join(root, '.hidden', 'e.md'));
    });

    it('00.4.2#13 (+1) should expose walkHtmlFiles → still filters *.html', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { walkHtmlFiles } = require('../../breadcrumb/breadcrumb.collector');
        const seen: string[] = [];
        walkHtmlFiles(root, (p: string) => seen.push(p));
        expect(seen.sort()).toEqual(
            [path.join(root, 'b.html'), path.join(root, 'sub', 'd.html')].sort(),
        );
    });
});

describe('shim: plugins/utils/html.utils.js', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const utils = require('../html.utils');

    it('00.4.1#09 should re-export isHtmlFile and isRootIndex', () => {
        expect(utils.isHtmlFile('a.html')).toBe(true);
        expect(utils.isHtmlFile('a.md')).toBe(false);
        expect(utils.isRootIndex('/repo/build', '/repo/build/index.html')).toBe(true);
        expect(utils.isRootIndex('/repo/build', '/repo/build/ru/index.html')).toBe(false);
    });
});