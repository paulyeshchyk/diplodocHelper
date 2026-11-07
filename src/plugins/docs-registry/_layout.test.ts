import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEFAULT_LAYOUT, loadLayout } from './_layout.ts';

let root: string;
let layoutPath: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-'));
  layoutPath = path.join(root, 'layout.json');
  jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

describe('loadLayout', () => {
  it('00.4.4#01 should return DEFAULT_LAYOUT when file does not exist', () => {
    expect(loadLayout(path.join(root, 'no.json'))).toMatchObject(DEFAULT_LAYOUT);
  });

  it('00.4.4#02 should parse full valid config', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({
      modulesFolder: 'booklets',
      modulePrefix: null,
      moduleIndexFile: 'index.md',
      moduleSectionTypes: null,
      outFolder: '_index',
      skipDirs: [],
    }));
    expect(loadLayout(layoutPath)).toMatchObject({
      modulesFolder: 'booklets',
      modulePrefix: null,
      moduleIndexFile: 'index.md',
      moduleSectionTypes: null,
      outFolder: '_index',
      skipDirs: [],
    });
  });

  it('00.4.4#03 should shallow-merge missing fields with defaults', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ outFolder: '_index' }));
    expect(loadLayout(layoutPath)).toMatchObject({
      ...DEFAULT_LAYOUT,
      outFolder: '_index',
    });
  });

  it('00.4.4#04 should treat null modulePrefix as walk-all', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ modulePrefix: null }));
    expect(loadLayout(layoutPath).modulePrefix).toBeNull();
  });

  it('00.4.4#05 should treat null modulesFolder as lang-root', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ modulesFolder: null }));
    expect(loadLayout(layoutPath).modulesFolder).toBeNull();
  });

  it('00.4.4#06 should parse moduleSectionTypes array', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ moduleSectionTypes: ['Page'] }));
    expect(loadLayout(layoutPath).moduleSectionTypes).toEqual(['Page']);
  });

  it('00.4.4#07 should coerce non-array moduleSectionTypes to null', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ moduleSectionTypes: 'Page' }));
    expect(loadLayout(layoutPath).moduleSectionTypes).toBeNull();
  });

  it('00.4.4#08 should warn on unknown keys and ignore them', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ outFolder: '_index', unknownKey: 1 }));
    const r = loadLayout(layoutPath);
    expect(r.outFolder).toBe('_index');
    expect(r).not.toHaveProperty('unknownKey');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('unknown key "unknownKey"'),
    );
  });

  it('00.4.4#09 should return default on invalid JSON', () => {
    fs.writeFileSync(layoutPath, '{ not json');
    expect(loadLayout(layoutPath)).toEqual(DEFAULT_LAYOUT);
  });

  it('00.4.4#10 should return default on non-object JSON', () => {
    fs.writeFileSync(layoutPath, '[]');
    expect(loadLayout(layoutPath)).toEqual(DEFAULT_LAYOUT);
  });

  it('00.4.4#11 should default strictDimensions=true, includeEmpty=false, emptyLabel="Без значения"', () => {
    expect(loadLayout(path.join(root, 'no.json'))).toMatchObject({
      strictDimensions: true,
      includeEmpty: false,
      emptyLabel: 'Без значения',
    });
  });

  it('00.4.4#12 should parse strictDimensions=false', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ strictDimensions: false }));
    expect(loadLayout(layoutPath).strictDimensions).toBe(false);
  });

  it('00.4.4#13 should parse includeEmpty=true', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ includeEmpty: true }));
    expect(loadLayout(layoutPath).includeEmpty).toBe(true);
  });

  it('00.4.4#14 should parse includeEmpty as string array', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ includeEmpty: ['content_type', 'status'] }));
    expect(loadLayout(layoutPath).includeEmpty).toEqual(['content_type', 'status']);
  });

  it('00.4.4#15 should parse emptyLabel as string', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({ emptyLabel: 'Без значения' }));
    expect(loadLayout(layoutPath).emptyLabel).toBe('Без значения');
  });

  it('00.4.4#16 should parse emptyLabel as object', () => {
    fs.writeFileSync(layoutPath, JSON.stringify({
      emptyLabel: { content_type: 'Без типа', audience: 'Без АРМ' },
    }));
    expect(loadLayout(layoutPath).emptyLabel).toEqual({
      content_type: 'Без типа',
      audience: 'Без АРМ',
    });
  });
});