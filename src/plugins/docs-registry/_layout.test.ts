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
    expect(loadLayout(path.join(root, 'no.json'))).toEqual(DEFAULT_LAYOUT);
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
    expect(loadLayout(layoutPath)).toEqual({
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
    expect(loadLayout(layoutPath)).toEqual({
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
});