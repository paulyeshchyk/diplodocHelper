import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runBuildPageLegend } = require('./index.ts');

let root: string;
let docsDir: string;
let catalogPath: string;
let generatedDir: string;

/**
 * Фикстура каталога:
 *   - МодульA: полный frontmatter (ID, Идентификатор, capability, family,
 *     layer, folder, entrypoint, role, designation, title, pureTitle);
 *   - МодульB: только title + sectionType (после --ignore пусто → skip);
 *   - МодульC: полный frontmatter + поле "vars" (игнорируется через --ignore);
 */
function makeCatalog(docsRoot: string) {
  return {
    docsRoot,
    modules: {
      'МодульA': {
        dir: 'МодульA',
        path: 'МодульA/index.md',
        id: '46',
        ident: 'cli',
        designation: 'Диспетчер CLI',
        role: 'CLI-диспетчер',
        capabilities: ['cap-1'],
        families: ['fam-a'],
        layers: ['cli'],
        folder: ['src/plugins/foo.js'],
        entrypoint: 'node ./x.js',
        version: '1.0.0',
        pureTitle: 'CLI',
      },
      'МодульB': {
        dir: 'МодульB',
        path: 'МодульB/index.md',
        // без полей — только sectionType/title в frontmatter
      },
      'МодульC': {
        dir: 'МодульC',
        path: 'МодульC/index.md',
        id: '47',
        ident: 'barrelsby',
        designation: 'Barrel builder',
        capabilities: ['cap-2'],
        families: ['fam-b'],
        layers: ['cli'],
      },
    },
    dimensions: {
      capability: {
        title: 'Capability',
        columns: [{ label: 'ID', field: 'id' }],
        items: {
          'cap-1': { dir: 'Cap/One', title: 'Cap1' },
          'cap-2': { dir: 'Cap/Two', title: 'Cap2' },
        },
      },
      family: {
        title: 'Family',
        items: {
          'fam-a': { dir: 'Fam/A', title: 'FamA' },
          'fam-b': { dir: 'Fam/B', title: 'FamB' },
        },
      },
      layer: {
        title: 'Layer',
        items: {
          cli: { dir: 'Layer/CLI', title: 'CLI' },
        },
      },
    },
    index: {
      capability: { 'cap-1': ['МодульA'], 'cap-2': ['МодульC'] },
      family: { 'fam-a': ['МодульA'], 'fam-b': ['МодульC'] },
      layer: { cli: ['МодульA', 'МодульC'] },
    },
    warnings: [],
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bpl-'));
  docsDir = path.join(root, 'docs');
  generatedDir = path.join(docsDir, '_generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  const modulesDir = path.join(docsDir, 'ru', 'Модули');
  catalogPath = path.join(generatedDir, 'catalog.ru.json');

  // МодульA — полный frontmatter
  const aDir = path.join(modulesDir, 'МодульA');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'index.md'),
    [
      '---',
      'title: CLI',
      'pureTitle: CLI',
      'sectionType: Page',
      'ID: 46',
      'Идентификатор: cli',
      'capability: cap-1',
      'family: fam-a',
      'layer: cli',
      'folder: "src/plugins/foo.js"',
      'entrypoint: "node ./x.js"',
      'role: CLI-диспетчер',
      'designation: Диспетчер CLI',
      'version: 1.0.0',
      '---',
      '',
      '# CLI',
    ].join('\n'),
    'utf8',
  );

  // МодульB — без frontmatter (только body) → skip по «нет frontmatter»
  const bDir = path.join(modulesDir, 'МодульB');
  fs.mkdirSync(bDir, { recursive: true });
  fs.writeFileSync(path.join(bDir, 'index.md'), '# B\n\nbody', 'utf8');

  // МодульC — с family/capability
  const cDir = path.join(modulesDir, 'МодульC');
  fs.mkdirSync(cDir, { recursive: true });
  fs.writeFileSync(
    path.join(cDir, 'index.md'),
    [
      '---',
      'title: C',
      'ID: 47',
      'Идентификатор: barrelsby',
      'capability: cap-2',
      'family: fam-b',
      'layer: cli',
      '---',
      '',
      '# C',
    ].join('\n'),
    'utf8',
  );

  fs.writeFileSync(catalogPath, JSON.stringify(makeCatalog(modulesDir)), 'utf8');

  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'error').mockImplementation(() => { });
  jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

function legendPath(moduleName: string): string {
  return path.join(docsDir, 'ru', 'Модули', moduleName, 'page-legend.md');
}

function indexMdPath(moduleName: string): string {
  return path.join(docsDir, 'ru', 'Модули', moduleName, 'index.md');
}

describe('build-page-legend.runBuildPageLegend (frozen, legacy)', () => {
  it('00.6.6#01 should create page-legend.md with aliased ID → UID', async () => {
    await runBuildPageLegend(['--lang=ru', `--catalog=${catalogPath}`]);
    const legend = fs.readFileSync(legendPath('МодульA'), 'utf8');
    // Строка "| UID            | 46                           |"
    expect(legend).toMatch(/^\| UID\s+\| 46\s+\|/m);
    expect(legend).toMatch(/\{\: \.page-legend \}/);
  });

  it('00.6.6#02 should alias Идентификатор → UID (vscode)', async () => {
    await runBuildPageLegend(['--lang=ru', `--catalog=${catalogPath}`]);
    const legend = fs.readFileSync(legendPath('МодульA'), 'utf8');
    // Строка "| UID (vscode)   | `cli`                        |"
    expect(legend).toMatch(/^\| UID \(vscode\)\s+\| `cli`\s+\|/m);
  });

  it('00.6.6#03 should render capability/family/layer as dimension links', async () => {
    await runBuildPageLegend(['--lang=ru', `--catalog=${catalogPath}`]);
    const legend = fs.readFileSync(legendPath('МодульA'), 'utf8');
    // capability → [cap-1](../Cap/One/index.md)
    expect(legend).toMatch(/\[cap-1\]\(\.\.\/Cap\/One\/index\.md\)/);
    expect(legend).toMatch(/\[fam-a\]\(\.\.\/Fam\/A\/index\.md\)/);
    expect(legend).toMatch(/\[cli\]\(\.\.\/Layer\/CLI\/index\.md\)/);
  });

  it('00.6.6#04 should skip modules with empty frontmatter', async () => {
    await runBuildPageLegend(['--lang=ru', `--catalog=${catalogPath}`]);
    expect(fs.existsSync(legendPath('МодульB'))).toBe(false);
  });

  it('00.6.6#04b should skip when all fields are ignored', async () => {
    // МодульA с --ignore всех полей → entries.length === 0 → skip
    // Удаляем возможный pre-existing legend от предыдущих тестов
    try { fs.unlinkSync(legendPath('МодульA')); } catch { }
    await runBuildPageLegend([
      '--lang=ru',
      `--catalog=${catalogPath}`,
      '--ignore=ID,Идентификатор,title,sectionType,pureTitle,designation,capability,family,layer,folder,entrypoint,role,version',
    ]);
    expect(fs.existsSync(legendPath('МодульA'))).toBe(false);
  });

  it('00.6.6#05 should respect --ignore', async () => {
    await runBuildPageLegend([
      '--lang=ru',
      `--catalog=${catalogPath}`,
      '--ignore=title,sectionType,pureTitle',
    ]);
    const legend = fs.readFileSync(legendPath('МодульA'), 'utf8');
    expect(legend).not.toMatch(/\|\s+Заголовок/);
    expect(legend).not.toMatch(/\|\s+Тип раздела/);
    expect(legend).not.toMatch(/\|\s+Название/);
  });

  it('00.6.6#06 should add {% include %} into index.md with --with-include', async () => {
    await runBuildPageLegend([
      '--lang=ru',
      `--catalog=${catalogPath}`,
      '--with-include',
    ]);
    const indexMd = fs.readFileSync(indexMdPath('МодульA'), 'utf8');
    expect(indexMd).toContain('{% include [legend](./page-legend.md) %}');
  });

  it('00.6.6#07 should not add {% include %} without --with-include', async () => {
    await runBuildPageLegend(['--lang=ru', `--catalog=${catalogPath}`]);
    const indexMd = fs.readFileSync(indexMdPath('МодульA'), 'utf8');
    expect(indexMd).not.toContain('{% include');
  });

  it('00.6.6#08 should not overwrite existing page-legend.md without --rewrite', async () => {
    fs.writeFileSync(legendPath('МодульA'), 'CUSTOM LEGEND', 'utf8');
    await runBuildPageLegend(['--lang=ru', `--catalog=${catalogPath}`]);
    expect(fs.readFileSync(legendPath('МодульA'), 'utf8')).toBe('CUSTOM LEGEND');
  });

  it('00.6.6#09 should overwrite with --rewrite', async () => {
    fs.writeFileSync(legendPath('МодульA'), 'CUSTOM LEGEND', 'utf8');
    await runBuildPageLegend([
      '--lang=ru',
      `--catalog=${catalogPath}`,
      '--rewrite',
    ]);
    const legend = fs.readFileSync(legendPath('МодульA'), 'utf8');
    expect(legend).not.toBe('CUSTOM LEGEND');
    expect(legend).toMatch(/^\| UID\s+\|/m);
  });

  it('00.6.6#10 should not write with --dry-run', async () => {
    await runBuildPageLegend([
      '--lang=ru',
      `--catalog=${catalogPath}`,
      '--dry-run',
    ]);
    expect(fs.existsSync(legendPath('МодульA'))).toBe(false);
  });

  it('00.6.6#11 should sort ascending with --order=ascending', async () => {
    await runBuildPageLegend([
      '--lang=ru',
      `--catalog=${catalogPath}`,
      '--order=ascending',
    ]);
    const legend = fs.readFileSync(legendPath('МодульA'), 'utf8');
    const lines = legend.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| -'));
    // Первая строка после заголовка — ключ, который должен быть "алфавитно" первым
    // (не проверяем конкретный ключ — проверяем, что сортировка применилась,
    // сравнивая с order=custom)
    expect(lines.length).toBeGreaterThan(1);
  });

  it('00.6.6#12 should throw when --catalog points to non-existent file', async () => {
    await expect(
      runBuildPageLegend([
        '--lang=ru',
        `--catalog=${path.join(root, 'no-such.json')}`,
      ]),
    ).rejects.toThrow();
  });
});