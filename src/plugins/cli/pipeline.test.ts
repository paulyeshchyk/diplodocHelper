import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEFAULT_PIPELINE } from './pipeline.constants.ts';
import { loadPipeline } from './pipeline.loader.ts';
import { isEntryEnabled, mergeModuleOptions } from './pipeline.merge.ts';
import { runPipeline } from './pipeline.runner.ts';
import { CommandRegistry } from './registry.ts';
import type { ArgSpec, ModuleDef, ModuleImpl } from './types.ts';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-'));
  jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

function writeConfig(content: string, name = 'plugins.config.yaml'): string {
  const p = path.join(root, name);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// ---------------------------------------------------------------------------
// loadPipeline
// ---------------------------------------------------------------------------

describe('loadPipeline', () => {
  it('00.7.3#01 should return DEFAULT_PIPELINE when path is null', () => {
    expect(loadPipeline(null)).toBe(DEFAULT_PIPELINE);
  });

  it('00.7.3#02 should return DEFAULT_PIPELINE when file does not exist', () => {
    expect(loadPipeline(path.join(root, 'nope.yaml'))).toBe(DEFAULT_PIPELINE);
  });

  it('00.7.3#03 should parse YAML and merge with defaults', () => {
    const p = writeConfig(`
lang: en
common:
  logLevel: info
stages:
  pre:
    - module: collectCatalog
    - module: emitFeatureMap
      enabled: false
`);
    const r = loadPipeline(p);
    expect(r.source).toBe('file');
    expect(r.lang).toBe('en');
    expect(r.common.logLevel).toBe('info');
    expect(r.common.stopOnError).toBe(true);  // default
    expect(r.stages.pre).toHaveLength(2);
    expect(r.stages.build).toEqual([{ module: 'diplodocBuild' }]);  // fallback из DEFAULT_PIPELINE
  });
  it('00.7.3#03b should respect explicit empty build stage', () => {
    const p = writeConfig(`
stages:
  pre:
    - module: collectCatalog
  build: []
`);
    const r = loadPipeline(p);
    expect(r.stages.build).toEqual([]);  // явный [] не fallback'ится
  });

  it('00.7.3#04 should parse JSON', () => {
    const p = writeConfig(JSON.stringify({
      lang: 'en',
      stages: { pre: [{ module: 'a' }] },
    }), 'plugins.config.json');
    const r = loadPipeline(p);
    expect(r.lang).toBe('en');
    expect(r.stages.pre).toHaveLength(1);
  });

  it('00.7.3#05 should throw on invalid entry (no module)', () => {
    const p = writeConfig(`
stages:
  pre:
    - enabled: true
`);
    expect(() => loadPipeline(p)).toThrow(/module/);
  });

  it('00.7.3#06 should preserve explicit empty stage', () => {
    const p = writeConfig(`
stages:
  pre: []
`);
    const r = loadPipeline(p);
    expect(r.stages.pre).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mergeModuleOptions
// ---------------------------------------------------------------------------

describe('mergeModuleOptions', () => {
  const common = {
    lang: 'ru', logLevel: 'off', stopOnError: true, dryRun: false, verbose: false,
  };

  it('00.7.3#07 should merge L1 common into empty L2/L3', () => {
    const r = mergeModuleOptions({ module: 'foo' }, common as any, null);
    expect(r.lang).toBe('ru');
    expect(r.logLevel).toBe('off');
  });

  it('00.7.3#08 should let L2 override L1', () => {
    const r = mergeModuleOptions(
      { module: 'foo', options: { logLevel: 'info' } },
      common as any,
      null,
    );
    expect(r.logLevel).toBe('info');
  });

  it('00.7.3#09 should let L2 override L3', () => {
    const r = mergeModuleOptions(
      { module: 'foo', options: { logLevel: 'info' } },
      common as any,
      { logLevel: 'error' },
    );
    expect(r.logLevel).toBe('info');
  });

  it('00.7.3#10 should let L1 override L3', () => {
    const r = mergeModuleOptions(
      { module: 'foo' },
      common as any,
      { lang: 'en' },
    );
    expect(r.lang).toBe('ru');
  });

  it('00.7.3#11 should exclude enabled/module from merged opts', () => {
    const r = mergeModuleOptions(
      { module: 'foo', enabled: true },
      common as any,
      { module: 'x', enabled: false },
    );
    expect(r).not.toHaveProperty('enabled');
    expect(r).not.toHaveProperty('module');
  });

  const flagArg: ArgSpec = {
    name: 'flag', flag: '--flag', type: 'boolean', description: 'f', default: true,
  };

  it('00.7.3#21 should apply L4 defaults when nothing else specifies the value', () => {
    const r = mergeModuleOptions({ module: 'foo' }, common as any, null, [flagArg]);
    expect(r.flag).toBe(true);
  });

  it('00.7.3#22 should let L3 override L4', () => {
    const r = mergeModuleOptions({ module: 'foo' }, common as any, { flag: false }, [flagArg]);
    expect(r.flag).toBe(false);
  });

  it('00.7.3#23 should let L1 override L4', () => {
    const langArg: ArgSpec = {
      name: 'lang', flag: '--lang', type: 'string', description: 'l', default: 'ru',
    };
    const r = mergeModuleOptions(
      { module: 'foo' },
      { ...common, lang: 'en' } as any,
      null,
      [langArg],
    );
    expect(r.lang).toBe('en');
  });

  it('00.7.3#24 should let L2 override L4', () => {
    const r = mergeModuleOptions(
      { module: 'foo', options: { flag: false } },
      common as any,
      null,
      [flagArg],
    );
    expect(r.flag).toBe(false);
  });
});

describe('isEntryEnabled', () => {
  it('00.7.3#12 should treat undefined as enabled', () => {
    expect(isEntryEnabled({ module: 'x' })).toBe(true);
  });
  it('00.7.3#13 should treat enabled=false as disabled', () => {
    expect(isEntryEnabled({ module: 'x', enabled: false })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runPipeline
// ---------------------------------------------------------------------------

function mkModule(
  name: string,
  phase: 'pre' | 'build' | 'post' = 'pre',
  impl?: ModuleImpl,
): ModuleDef {
  return {
    name,
    description: '',
    phase,
    defaultOrder: 10,
    args: [],
    async load() { return impl ?? { async run() { } }; },
  };
}

function mkPipeline(stages: any, common: any = {}): any {
  return {
    lang: 'ru',
    common: {
      lang: 'ru', logLevel: 'off', stopOnError: true, dryRun: false, verbose: false,
      ...common,
    },
    stages: {
      pre: stages.pre ?? [],
      build: stages.build ?? [],
      post: stages.post ?? [],
    },
    source: 'file',
  };
}

describe('runPipeline', () => {
  it('00.7.3#14 should run enabled modules in order', async () => {
    const order: string[] = [];
    const r = new CommandRegistry();
    r.register(mkModule('a', 'pre', { async run() { order.push('a'); } }));
    r.register(mkModule('b', 'pre', { async run() { order.push('b'); } }));

    const result = await runPipeline(
      mkPipeline({ pre: [{ module: 'a' }, { module: 'b' }] }),
      r,
      { stage: 'pre', projectRoot: root },
    );
    expect(order).toEqual(['a', 'b']);
    expect(result.executed).toEqual(['a', 'b']);
    expect(result.ok).toBe(true);
  });

  it('00.7.3#15 should respect explicit order in yaml (reordering)', async () => {
    const order: string[] = [];
    const r = new CommandRegistry();
    r.register(mkModule('a', 'pre', { async run() { order.push('a'); } }));
    r.register(mkModule('b', 'pre', { async run() { order.push('b'); } }));

    await runPipeline(
      mkPipeline({ pre: [{ module: 'b' }, { module: 'a' }] }),
      r,
      { stage: 'pre', projectRoot: root },
    );
    expect(order).toEqual(['b', 'a']);
  });

  it('00.7.3#16 should skip disabled entries', async () => {
    const r = new CommandRegistry();
    r.register(mkModule('a', 'pre', { async run() { } }));
    r.register(mkModule('b', 'pre', { async run() { throw new Error('should not run'); } }));

    const result = await runPipeline(
      mkPipeline({ pre: [{ module: 'a' }, { module: 'b', enabled: false }] }),
      r,
      { stage: 'pre', projectRoot: root },
    );
    expect(result.executed).toEqual(['a']);
    expect(result.skipped).toEqual(['b']);
  });

  it('00.7.3#17 should stop on first error when stopOnError=true', async () => {
    const r = new CommandRegistry();
    r.register(mkModule('a', 'pre', { async run() { throw new Error('boom'); } }));
    r.register(mkModule('b', 'pre', { async run() { /* shouldn't run */ } }));

    await expect(
      runPipeline(
        mkPipeline({ pre: [{ module: 'a' }, { module: 'b' }] }),
        r,
        { stage: 'pre', projectRoot: root },
      ),
    ).rejects.toThrow(/boom/);
  });

  it('00.7.3#18 should continue on error when stopOnError=false', async () => {
    const order: string[] = [];
    const r = new CommandRegistry();
    r.register(mkModule('a', 'pre', { async run() { throw new Error('boom'); } }));
    r.register(mkModule('b', 'pre', { async run() { order.push('b'); } }));

    const result = await runPipeline(
      mkPipeline(
        { pre: [{ module: 'a' }, { module: 'b' }] },
        { stopOnError: false },
      ),
      r,
      { stage: 'pre', projectRoot: root },
    );
    expect(order).toEqual(['b']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].module).toBe('a');
    expect(result.ok).toBe(false);
  });

  it('00.7.3#19 should throw on unknown module (stopOnError=true)', async () => {
    const r = new CommandRegistry();
    await expect(
      runPipeline(
        mkPipeline({ pre: [{ module: 'nope' }] }),
        r,
        { stage: 'pre', projectRoot: root },
      ),
    ).rejects.toThrow(/не зарегистрирован/);
  });

  it('00.7.3#20 should handle stage=all running pre→build→post', async () => {
    const order: string[] = [];
    const r = new CommandRegistry();
    r.register(mkModule('a', 'pre', { async run() { order.push('a'); } }));
    r.register(mkModule('b', 'build', { async run() { order.push('b'); } }));
    r.register(mkModule('c', 'post', { async run() { order.push('c'); } }));

    await runPipeline(
      mkPipeline({
        pre: [{ module: 'a' }],
        build: [{ module: 'b' }],
        post: [{ module: 'c' }],
      }),
      r,
      { stage: 'all', projectRoot: root },
    );
    expect(order).toEqual(['a', 'b', 'c']);
  });

});