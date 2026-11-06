import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runEmitModulesTable } = require('./index.ts');

let root: string;
let docsDir: string;
let catalogPath: string;
let generatedDir: string;

function makeCatalog(docsRoot: string) {
  return {
    docsRoot,
    modules: {
      'МодульA': {
        dir: 'МодульA',
        path: 'МодульA/index.md',
        id: '10',
        ident: 'cli',
        designation: 'Dispatcher CLI',
        role: 'CLI-role',
        capabilities: ['cap-1'],
        families: ['fam-a'],
        layers: ['cli'],
        folder: ['src/foo.js', 'src/bar.js'],
        entrypoint: 'node ./x.js',
        version: '1.0.0',
      },
      'МодульB': {
        dir: 'МодульB',
        path: 'МодульB/index.md',
        id: '2',
        ident: 'abc',
        capabilities: ['cap-2'],
        families: ['fam-b'],
        layers: ['ui'],
        folder: ['src/baz.js'],
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
      actor: {
        title: 'Актор',
        columns: [
          { label: 'ID', field: 'id' },
          { label: 'Модуль', field: 'ident' },
        ],
        items: {
          ci: { dir: 'A/CI', title: 'CI' },
        },
      },
      family: {
        title: 'Семейство',
        columns: [],
        items: {
          'fam-a': { dir: 'F/A', title: 'FamA' },
          'fam-b': { dir: 'F/B', title: 'FamB' },
        },
      },
      layer: {
        title: 'Слой',
        columns: [],
        items: {
          cli: { dir: 'L/CLI', title: 'CLI' },
          ui: { dir: 'L/UI', title: 'UI' },
        },
      },
      capability: {
        title: 'Capability',
        columns: [],
        items: {
          'cap-1': { dir: 'C/1', title: 'Cap1' },
          'cap-2': { dir: 'C/2', title: 'Cap2' },
        },
      },
    },
    index: {
      actor: { ci: [] },
      family: { 'fam-a': ['МодульA', 'МодульC'], 'fam-b': ['МодульB'] },
      layer: { cli: ['МодульA', 'МодульC'], ui: ['МодульB'] },
      capability: { 'cap-1': ['МодульA', 'МодульC'], 'cap-2': ['МодульB'] },
    },
    warnings: [],
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'emt-'));
  docsDir = path.join(root, 'docs');
  generatedDir = path.join(docsDir, '_generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  // fields.yaml — маппинг frontmatter → поля каталога.
  // Используется emit-modules-table для рендера колонок.
  const registryDir = path.join(docsDir, '_registry');
  fs.mkdirSync(registryDir, { recursive: true });
  fs.writeFileSync(
    path.join(registryDir, 'fields.yaml'),
    [
      'fields:',
      '  id:          { format: plain }',
      '  ident:       { format: backtick }',
      '  designation: { format: plain }',
      '  actor:       { kind: multi, dimension: actor, dimField: actors }',
      '  capability:  { kind: multi, dimension: capability, dimField: capabilities }',
      '  family:      { kind: multi, dimension: family, dimField: families }',
      '  layer:       { kind: multi, dimension: layer, dimField: layers }',
      '  folder:      { format: backtick }',
      '  entrypoint:  { format: backtick }',
      '  version:     { format: backtick }',
    ].join('\n'),
    'utf8',
  );

  catalogPath = path.join(generatedDir, 'catalog.ru.json');
  fs.writeFileSync(catalogPath, JSON.stringify(makeCatalog(path.join(docsDir, 'ru', 'Модули'))), 'utf8');

  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'error').mockImplementation(() => { });
  jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

describe('emit-modules-table.runEmitModulesTable (frozen, legacy)', () => {
  async function run(extra: string[] = []): Promise<string> {
    const outPath = path.join(generatedDir, 'modules-table.ru.json');
    await runEmitModulesTable(
      [
        '--lang=ru',
        `--catalog=${catalogPath}`,
        `--out=${outPath}`,
        '--out-dir=' + path.join(docsDir, 'ru', 'Модули', 'Реестр'),
        ...extra,
      ],
      { docsDir, generatedDir },
    );
    return outPath;
  }

  it('00.6.7#01 should emit flat array sorted by natural id order', async () => {
    const out = await run();
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(rows).toHaveLength(3);
    // natural sort: 1 < 2 < 10
    expect(rows.map((r: any) => r.id_plain)).toEqual(['1', '2', '10']);
  });

  it('00.6.7#02 should render id as markdown link with #anchor', async () => {
    const out = await run(['--anchor=naznachenie']);
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    const row10 = rows.find((r: any) => r.id_plain === '10');
    // encodeURI кодирует кириллицу — decodeURI перед assert
    expect(decodeURI(row10.id)).toMatch(/^\[10\]\([^)]*МодульA\/index\.html#naznachenie\)$/);
  });

  it('00.6.7#03 should render ident in backticks and expose ident_plain', async () => {
    const out = await run();
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    const rowA = rows.find((r: any) => r.id_plain === '10');
    expect(rowA.ident).toBe('`cli`');
    expect(rowA.ident_plain).toBe('cli');
  });

  it('00.6.7#04 should expose dimension arrs and plain strings', async () => {
    const out = await run();
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    const rowA = rows.find((r: any) => r.id_plain === '10');

    expect(Array.isArray(rowA.capabilities_arr)).toBe(true);
    expect(rowA.capabilities_arr).toHaveLength(1);
    expect(rowA.capabilities_arr[0].slug).toBe('cap-1');
    expect(rowA.capabilities_arr[0].title).toBe('Cap1');
    expect(rowA.capabilities_arr[0].link).toMatch(/\[Cap1\]\([^)]*C\/1\/index\.html\)/);

    expect(rowA.capability_plain).toBe('Cap1');
    expect(rowA.family_plain).toBe('FamA');
    expect(rowA.layer_plain).toBe('CLI');
  });

  it('00.6.7#05 should render folder as array of backticked items', async () => {
    const out = await run();
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    const rowA = rows.find((r: any) => r.id_plain === '10');
    // folder: ['src/foo.js', 'src/bar.js'] → "`src/foo.js` / `src/bar.js`"
    expect(rowA.folder).toBe('`src/foo.js` / `src/bar.js`');
  });

  it('00.6.7#06 should set treemapLabel to "<id> <ident>"', async () => {
    const out = await run();
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    const rowA = rows.find((r: any) => r.id_plain === '10');
    expect(rowA.treemapLabel).toBe('10 cli');
  });

  it('00.6.7#07 should set id_href to module URL', async () => {
    const out = await run(['--anchor=naznachenie']);
    const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
    const rowA = rows.find((r: any) => r.id_plain === '10');

    expect(decodeURI(rowA.id_href)).toMatch(/\/ru\/Модули\/МодульA\/index\.html#naznachenie$/);
  });

  it('00.6.7#08 should throw when catalog does not exist', async () => {
    await expect(
      runEmitModulesTable([
        '--lang=ru',
        `--catalog=${path.join(root, 'no.json')}`,
        `--out=${path.join(generatedDir, 'x.json')}`,
      ]),
    ).rejects.toThrow();
  });

  it('00.6.7#09 should accept options.docsDir and options.generatedDir', async () => {
    const outPath = path.join(generatedDir, 'modules-table.ru.json');
    await runEmitModulesTable(
      ['--lang=ru', `--catalog=${catalogPath}`, `--out=${outPath}`],
      { docsDir, generatedDir },
    );
    expect(fs.existsSync(outPath)).toBe(true);
  });

});