// src/plugins/utils/link/Link_Build_Path.test.ts

import { describe, expect, it } from '@jest/globals';
import { Link_Build_Path } from './Link_Build_Path.ts';

describe('Link_Build_Path.buildRelative', () => {
    it('00.11.1#01 считает относительный путь для папки', () => {
        // из /docs/ru/current.md в /docs/ru/folder (папка → folder/index.md)
        expect(Link_Build_Path.buildRelative('/docs/ru/current.md', '/docs/ru/folder', true))
            .toBe('./folder/index.md');
    });

    it('00.11.1#02 считает относительный путь для .md файла', () => {
        expect(Link_Build_Path.buildRelative('/docs/ru/current.md', '/docs/ru/target.md', false))
            .toBe('./target.md');
    });

    it('00.11.1#03 считает относительный путь для картинки', () => {
        expect(Link_Build_Path.buildRelative('/docs/ru/current.md', '/docs/ru/img.png', false))
            .toBe('./img.png');
    });
});

describe('Link_Build_Path.buildAbsolute — only inside docs/', () => {
    it('00.11.1#10 папка внутри docs → /<lang>/<path>/index.html', () => {
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs/ru/foo', true),
        ).toBe('/ru/foo/index.html');
    });

    it('00.11.1#10b .md файл (не index) → /<lang>/<path>.html', () => {
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs/ru/foo/bar.md', false),
        ).toBe('/ru/foo/bar.html');
    });

    it('00.11.1#10c .md index и папка дают один и тот же /…/index.html', () => {
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs/ru/foo/index.md', false),
        ).toBe('/ru/foo/index.html');
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs/ru/foo', true),
        ).toBe('/ru/foo/index.html');
    });

    it('00.11.1#11 картинка — расширение сохраняется', () => {
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs/ru/img.png', false),
        ).toBe('/ru/img.png');
    });

    it('00.11.1#12 пробелы и кириллица кодируются посегментно', () => {
        // «Модули ФМ» — один сегмент, пробел внутри → %20
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs/ru/Модули ФМ', true),
        ).toBe('/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8%20%D0%A4%D0%9C/index.html');
    });

    it('00.11.1#13 цель — корень docs/ → /index.html', () => {
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/docs', true),
        ).toBe('/index.html');
    });

    // ── НОВОЕ: контракт «только внутри docs/» ──

    it('00.11.1#14 файл вне workspaceRoot → throw "outside workspace"', () => {
        expect(() =>
            Link_Build_Path.buildAbsolute('/project', '/other/foo.md', false),
        ).toThrow(/outside workspace/);
    });

    it('00.11.1#15 файл внутри workspaceRoot, но вне docs/ → throw "inside docs/"', () => {
        // /project/src/foo.md — внутри проекта, но Diplodoc такой файл не собирает
        expect(() =>
            Link_Build_Path.buildAbsolute('/project', '/project/src/foo.md', false),
        ).toThrow(/inside docs\//);
    });

    it('00.11.1#16 путь с .. снаружи docs/ → throw "inside docs/"', () => {
        // path.relative нормализует /project/docs/../scripts/foo.md → 'scripts/foo.md'
        // (не начинается с '..', но и не 'docs/...' → throw)
        expect(() =>
            Link_Build_Path.buildAbsolute('/project', '/project/docs/../scripts/foo.md', false),
        ).toThrow(/inside docs\//);
    });
    it('00.11.1#17 поддерживает нестандартное имя папки (documents)', () => {
        expect(
            Link_Build_Path.buildAbsolute('/project', '/project/documents/ru/foo.md', false, 'documents'),
        ).toBe('/ru/foo.html');
    });
});

describe('Link_Build_Path frozen snapshot', () => {
    const cases: ReadonlyArray<readonly [string, string, boolean, string]> = [
        ['/project', '/project/docs/ru/foo', true, '/ru/foo/index.html'],
        ['/project', '/project/docs/ru/foo/bar.md', false, '/ru/foo/bar.html'],
        ['/project', '/project/docs/ru/foo/index.md', false, '/ru/foo/index.html'],
        ['/project', '/project/docs/ru/img.png', false, '/ru/img.png'],
        ['/project', '/project/docs/ru/Модули ФМ', true, '/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8%20%D0%A4%D0%9C/index.html'],
        ['/project', '/project/docs', true, '/index.html'],
        // Строка ['/project', '/project/src/foo.md', false, '/src/foo.html'] УДАЛЕНА
    ];
    it('00.11.1#90 should keep frozen absolute paths', () => {
        for (const [root, target, isDir, expected] of cases) {
            expect(Link_Build_Path.buildAbsolute(root, target, isDir)).toBe(expected);
        }
    });
});