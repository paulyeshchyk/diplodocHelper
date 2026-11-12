import { describe, expect, it, jest } from '@jest/globals';
import { CommandRegistry } from './registry.ts';
import type { ModuleDef, ModuleImpl } from './types.ts';

function mkModule(
  name: string,
  phase: 'pre' | 'build' | 'post' = 'pre',
  defaultOrder = 10,
  impl?: ModuleImpl,
): ModuleDef {
  return {
    name,
    description: `desc-${name}`,
    phase,
    defaultOrder,
    args: [],
    async load() {
      return impl ?? { async run() { /* noop */ } };
    },
  };
}

describe('CommandRegistry', () => {
  it('00.7.1#11 should register and retrieve modules', () => {
    const r = new CommandRegistry();
    r.register(mkModule('foo'));
    expect(r.get('foo')).toBeDefined();
    expect(r.get('bar')).toBeUndefined();
  });

  it('00.7.1#12 should throw on duplicate name', () => {
    const r = new CommandRegistry();
    r.register(mkModule('foo'));
    expect(() => r.register(mkModule('foo'))).toThrow(/уже зарегистрирован/);
  });

  it('00.7.1#13 should list modules sorted by phase then defaultOrder', () => {
    const r = new CommandRegistry();
    r.register(mkModule('c', 'post', 10));
    r.register(mkModule('a', 'pre', 20));
    r.register(mkModule('b', 'pre', 10));
    const byPhase = r.listByPhase();
    expect(byPhase.pre.map(m => m.name)).toEqual(['b', 'a']);
    expect(byPhase.post.map(m => m.name)).toEqual(['c']);
  });

  it('00.7.1#14 should return machine-readable yaml-like list', () => {
    const r = new CommandRegistry();
    r.register({
      ...mkModule('foo', 'pre', 10), description: 'D', args: [
        { name: 'anchor', flag: '--anchor', type: 'string', description: 'A' },
      ]
    });
    const [item] = r.listYaml();
    expect(item).toMatchObject({
      name: 'foo',
      phase: 'pre',
      description: 'D',
      args: [{ flag: '--anchor', type: 'string' }],
    });
  });

  it('00.7.1#15 should lazy-load and run module with merged opts', async () => {
    const run = jest.fn(async () => { });
    const r = new CommandRegistry();
    r.register(mkModule('foo', 'pre', 10, { run }));

    // Module не declares own args → argv пустой, commonOpts идут в run() как есть.
    await r.run('foo', [], { lang: 'ru', verbose: false });

    expect(run).toHaveBeenCalledTimes(1);
    const opts = (run.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(opts.lang).toBe('ru');    // из commonOpts (module не имеет --lang)
    expect(opts.verbose).toBe(false);
  });

  it('00.7.1#16 should throw when running unregistered module', async () => {
    const r = new CommandRegistry();
    await expect(r.run('nope', [], {})).rejects.toThrow(/не зарегистрирован/);
  });


  it('00.7.1#17 should let CLI flag override commonOpts', async () => {
    const run = jest.fn(async () => { });
    const r = new CommandRegistry();
    r.register(mkModule('foo', 'pre', 10, { run }));
    // `--lang` — общий флаг (COMMON_ARGS). CLI доминирует над commonOpts.
    await r.run('foo', ['--lang=en'], { lang: 'ru' });
    const opts = (run.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(opts.lang).toBe('en');
  });

  it('00.7.1#18 should parse module-specific flags alongside common flags', async () => {
    const run = jest.fn(async () => { });
    const r = new CommandRegistry();
    r.register({
      ...mkModule('foo', 'pre', 10, { run }),
      args: [{ name: 'anchor', flag: '--anchor', type: 'string', description: 'anchor' }],
    });
    await r.run('foo', ['--lang=ru', '--anchor=naznachenie'], {});
    const opts = (run.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(opts.lang).toBe('ru');
    expect(opts.anchor).toBe('naznachenie');
  });
});