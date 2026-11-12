import { describe, expect, it } from '@jest/globals';
import { periodicStatModule } from './periodicStat.module.ts';

describe('periodicStat.module', () => {
  it('00.7.2#82 should have correct metadata', () => {
    expect(periodicStatModule.name).toBe('periodicStat');
    expect(periodicStatModule.phase).toBe('pre');
    expect(periodicStatModule.defaultOrder).toBe(63);
    expect(periodicStatModule.args).toEqual([]);
  });

  it('00.7.2#83 should lazy-load ModuleImpl', async () => {
    const impl = await periodicStatModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#84 should not throw for empty dirs (generateStat swallows)', async () => {
    const impl = await periodicStatModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs__',
      buildDir: '/tmp/__no_such_build__',
    });
  });
});