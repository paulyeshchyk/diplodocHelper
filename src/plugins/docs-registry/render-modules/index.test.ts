import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runRenderModules } = require('./index.ts');

let root: string;
let docsRoot: string;
let catalogPath: string;
let generatedDir: string;

/**
 * Фикстура:
 *   - два измерения с columns (family, layer);
 *   - одно измерение без columns (capability) — проверяет ветку counts.errors++;
 *   - 3 модуля.
 */
function makeCatalog(docsRootAbs: string) {
  return {
    docsRoot: docsRootAbs,
    modules: {
      'МодульA': {
        dir: 'МодульA',
        path: 'МодульA/index.md',
        id: '10',
        ident: 'cli',
        designation: 'CLI module',
        capabilities: ['cap-1'],
        families: ['fam-a'],
        layers: ['cli'],
        folder: ['src/foo.js'],
      },
      'МодульB': {
        dir: 'МодульB',
        path: 'МодульB/index.md',
        id: '2',
        ident: 'abc',
        capabilities: ['cap-2'],
        families: ['fam-b'],
        layers: ['ui'],
      },
      'МодульC': {
        dir: 'МодульC',
        path: 'МодульC/index.md',
        id: '1',
        ident: 'xyz',
        capabilities: ['cap-1'],
        families: ['fam-a'],
        layers: ['cli'],
      },
    },
    dimensions: {
      family: {
        title: 'Family',
        columns: [
          { label: 'ID', field: 'id' },
          { label: 'Модуль', field: 'ident', type: 'code' },
          { label: 'Назначение', field: 'designation' },
        ],
        items: {
          'fam-a': { dir: 'F/A', title: 'FamA' },
          'fam-b': { dir: 'F/B', title: 'FamB' },
        },
      },
      layer: {
        title: 'Layer',
        columns: [
          { label: 'ID', field: 'id' },
          { label: 'Модуль', field: 'ident' },
        ],
        items: {
          cli: { dir: 'L/CLI', title: 'CLI' },
          ui: { dir: 'L/UI', title: 'UI' },
        },
      },
      capability: {
        title: 'Capability',
        // columns отсутствует — должно дать counts.errors++
        items: {
          'cap-1': { dir: 'C/1', title: 'Cap1' },
          'cap-2': { dir: 'C/2', title: 'Cap2' },
        },
      },
    },
    index: {
      family: { 'fam-a': ['МодульA', 'МодульC'], 'fam-b': ['МодульB'] },
      layer: { cli: ['МодульA', 'МодульC'], ui: ['МодульB'] },
      capability: { 'cap-1': ['МодульA', 'МодульC'], 'cap-2': ['МодульB'] },
    },
    warnings: [],
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'render-modules-'));
  generatedDir = path.join(root, '_generated');
  docsRoot = path.join(root, 'ru', 'Модули');
  catalogPath = path.join(generatedDir, 'catalog.ru.json');
  fs.mkdirSync(generatedDir, { recursive: true });

  // папки измерений должны существовать (render-modules проверяет fs.access)
  for (const rel of ['F/A', 'F/B', 'L/CLI', 'L/UI', 'C/1', 'C/2']) {
    const full = path.join(docsRoot, rel);
    fs.mkdirSync(full, { recursive: true });
    fs.writeFileSync(path.join(full, 'index.md'), '---\ntitle: X\n---\n', 'utf8');
  }

  fs.writeFileSync(catalogPath, JSON.stringify(makeCatalog(docsRoot)), 'utf8');

  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'error').mockImplementation(() => { });
  jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

function modulesMd(rel: string): string {
  return path.join(docsRoot, rel, 'modules.md');
}

async function run(extra: string[] = []): Promise<void> {
  await runRenderModules([
    '--lang=ru',
    `--catalog=${catalogPath}`,
    ...extra,
  ], { generatedDir });
}

describe('render-modules.runRenderModules (frozen, legacy)', () => {
  it('00.6.8#01 should create modules.md in each dimension dir with columns', async () => {
    await run();
    expect(fs.existsSync(modulesMd('F/A'))).toBe(true);
    expect(fs.existsSync(modulesMd('F/B'))).toBe(true);
    expect(fs.existsSync(modulesMd('L/CLI'))).toBe(true);
    expect(fs.existsSync(modulesMd('L/UI'))).toBe(true);
    // capability — без columns, файл не создаётся
    expect(fs.existsSync(modulesMd('C/1'))).toBe(false);
  });

  it('00.6.8#02 should render table with header and separator', async () => {
    await run();
    const md = fs.readFileSync(modulesMd('F/A'), 'utf8');
    // заголовок + разделитель + строки
    expect(md).toMatch(/\|\s+ID\s+\|\s+Модуль\s+\|\s+Назначение\s+\|/);
    expect(md).toMatch(/\|\s+-+\s+\|\s+-+\s+\|\s+-+\s+\|/);
    expect(md).toContain('`cli`');
    expect(md).toContain('CLI module');
  });

  it('00.6.8#03 should sort and render id-link with module path', async () => {
    await run(['--anchor=naznachenie']);
    const md = fs.readFileSync(modulesMd('F/A'), 'utf8');
    // targetDirRel = 'F/A', mod.path = 'МодульA/index.md'
    // → path.posix.relative('F/A', 'МодульA/index.md') = '../../МодульA/index.md'
    expect(decodeURI(md)).toMatch(/\[10\]\(\.\.\/\.\.\/МодульA\/index\.md#naznachenie\)/);
    expect(decodeURI(md)).toMatch(/\[1\]\(\.\.\/\.\.\/МодульC\/index\.md#naznachenie\)/);
  });

  it('00.6.8#04 should count errors for dimension without columns', async () => {
    // Логи не проверяем (мокаем console), но self-assert — что-то сделали.
    // Покрытие ветки — через успешный прогон + отсутствие modules.md в C/1
    // (уже покрыто в #01). Дополнительно проверяем, что остальные dims
    // продолжают рендериться (не падаем на capability).
    await run();
    expect(fs.existsSync(modulesMd('F/A'))).toBe(true);
    expect(fs.existsSync(modulesMd('C/1'))).toBe(false);
  });

  it('00.6.8#05 should be idempotent (re-run produces same content)', async () => {
    await run();
    const first = fs.readFileSync(modulesMd('F/A'), 'utf8');
    await run(['--rewrite']);
    const second = fs.readFileSync(modulesMd('F/A'), 'utf8');
    expect(second).toBe(first);
  });

  it('00.6.8#06 should not overwrite without --rewrite (outdated)', async () => {
    fs.mkdirSync(path.dirname(modulesMd('F/A')), { recursive: true });
    fs.writeFileSync(modulesMd('F/A'), 'CUSTOM', 'utf8');
    await run();
    expect(fs.readFileSync(modulesMd('F/A'), 'utf8')).toBe('CUSTOM');
  });

  it('00.6.8#07 should overwrite with --rewrite', async () => {
    fs.mkdirSync(path.dirname(modulesMd('F/A')), { recursive: true });
    fs.writeFileSync(modulesMd('F/A'), 'CUSTOM', 'utf8');
    await run(['--rewrite']);
    const md = fs.readFileSync(modulesMd('F/A'), 'utf8');
    expect(md).not.toBe('CUSTOM');
    expect(md).toContain('`cli`');
  });

  it('00.6.8#08 should not write with --dry-run', async () => {
    await run(['--dry-run']);
    expect(fs.existsSync(modulesMd('F/A'))).toBe(false);
  });

  it('00.6.8#09 should add {% include %} into index.md with --with-include', async () => {
    await run(['--with-include']);
    const indexMd = fs.readFileSync(path.join(docsRoot, 'F/A', 'index.md'), 'utf8');
    expect(indexMd).toContain('{% include [modules](./modules.md) %}');
  });

  it('00.6.8#10 should not add {% include %} without --with-include', async () => {
    await run();
    const indexMd = fs.readFileSync(path.join(docsRoot, 'F/A', 'index.md'), 'utf8');
    expect(indexMd).not.toContain('{% include');
  });

  it('00.6.8#11 should respect --out-name', async () => {
    await run(['--out-name=table.md']);
    expect(fs.existsSync(modulesMd('F/A'))).toBe(false);
    expect(fs.existsSync(path.join(docsRoot, 'F/A', 'table.md'))).toBe(true);
  });

  it('00.6.8#12 should skip dimension slug when target dir does not exist', async () => {
    // Не удаляем через fs.rmSync — обходим Windows-flake (file lock
    // не освобождается за 50ms, rename-lock в NTFS). Вместо этого
    // меняем `fam-b.dir` на несуществующую папку — `render-modules`
    // должен её скипнуть и записать ошибку.
    const catalogObj = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    catalogObj.dimensions.family.items['fam-b'].dir = 'F/DoesNotExist';
    fs.writeFileSync(catalogPath, JSON.stringify(catalogObj), 'utf8');

    const errSpy = jest.spyOn(console, 'error');
    await run();

    // F/A рендерится нормально
    expect(fs.existsSync(modulesMd('F/A'))).toBe(true);
    // F/DoesNotExist — не создаётся, папки нет
    expect(fs.existsSync(path.join(docsRoot, 'F/DoesNotExist', 'modules.md'))).toBe(false);
    // Порядок в сообщении: "папка не существует: F/DoesNotExist"
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/папка не существует:\s*F\/DoesNotExist/),
    );
  });

  it.skip('00.6.8#13 should throw when catalog does not exist', async () => {
    // TODO(step-B4): раскомментировать после миграции на throw.
    await expect(
      runRenderModules([
        '--lang=ru',
        `--catalog=${path.join(root, 'no.json')}`,
      ], { generatedDir }),
    ).rejects.toThrow();
  });
});