import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { findProjectRoot, resolveConfigPath, resolvePluginConfigPath } from './paths.ts';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-paths-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('findProjectRoot', () => {
  it('00.7.1#17 should find nearest package.json walking up', () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}', 'utf8');
    const nested = path.join(root, 'a', 'b', 'c');
    fs.mkdirSync(nested, { recursive: true });
    expect(findProjectRoot(nested)).toBe(root);
  });

  it('00.7.1#18 should prefer nearest package.json in nested projects', () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}', 'utf8');
    const inner = path.join(root, 'docs');
    fs.mkdirSync(inner, { recursive: true });
    fs.writeFileSync(path.join(inner, 'package.json'), '{}', 'utf8');
    expect(findProjectRoot(path.join(inner, 'plugins'))).toBe(inner);
  });

  it('00.7.1#19 should return null when no package.json found', () => {
    const lonely = path.join(root, 'a', 'b');
    fs.mkdirSync(lonely, { recursive: true });
    expect(findProjectRoot(lonely)).toBeNull();
  });
});

describe('resolveConfigPath', () => {
  it('00.7.1#20 should prefer --config over projectRoot default', () => {
    fs.writeFileSync(path.join(root, 'plugins.config.yaml'), '', 'utf8');
    const explicit = path.join(root, 'ci.yaml');
    expect(resolveConfigPath(explicit, root)).toBe(path.resolve(explicit));
  });

  it('00.7.1#21 should fall back to <projectRoot>/plugins.config.yaml', () => {
    const p = path.join(root, 'plugins.config.yaml');
    fs.writeFileSync(p, '', 'utf8');
    expect(resolveConfigPath(null, root)).toBe(p);
  });

  it('00.7.1#22 should prefer .yaml over .yml over .json', () => {
    fs.writeFileSync(path.join(root, 'plugins.config.yaml'), '', 'utf8');
    fs.writeFileSync(path.join(root, 'plugins.config.yml'), '', 'utf8');
    fs.writeFileSync(path.join(root, 'plugins.config.json'), '{}', 'utf8');
    expect(resolveConfigPath(null, root)).toBe(path.join(root, 'plugins.config.yaml'));
  });

  it('00.7.1#23 should return null when nothing found', () => {
    expect(resolveConfigPath(null, root)).toBeNull();
    expect(resolveConfigPath(null, null)).toBeNull();
  });
});

describe('resolvePluginConfigPath', () => {
  it('00.7.1#24 should prefer src/plugins/<name> over plugins/<name>', () => {
    const devDir = path.join(root, 'src', 'plugins', 'foo');
    const runDir = path.join(root, 'plugins', 'foo');
    fs.mkdirSync(devDir, { recursive: true });
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(devDir, 'plugin.config.yaml'), '', 'utf8');
    fs.writeFileSync(path.join(runDir, 'plugin.config.yaml'), '', 'utf8');
    expect(resolvePluginConfigPath(root, 'foo')).toBe(
      path.join(devDir, 'plugin.config.yaml'),
    );
  });

  it('00.7.1#25 should fall back to runtime path', () => {
    const runDir = path.join(root, 'plugins', 'foo');
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'plugin.config.yaml'), '', 'utf8');
    expect(resolvePluginConfigPath(root, 'foo')).toBe(
      path.join(runDir, 'plugin.config.yaml'),
    );
  });

  it('00.7.1#26 should return null when no L3 config', () => {
    expect(resolvePluginConfigPath(root, 'foo')).toBeNull();
    expect(resolvePluginConfigPath(null, 'foo')).toBeNull();
  });
});