import { describe, expect, it } from '@jest/globals';
import { periodicTableModule } from './periodicTable.module.ts';

describe('periodicTable.module', () => {
  it('00.7.2#85 should have correct metadata', () => {
    expect(periodicTableModule.name).toBe('periodicTable');
    expect(periodicTableModule.phase).toBe('post');
    expect(periodicTableModule.defaultOrder).toBe(55);
    expect(periodicTableModule.args).toEqual([]);
  });

  it('00.7.2#86 should lazy-load ModuleImpl', async () => {
    const impl = await periodicTableModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#87 should not throw for empty dirs', async () => {
    const impl = await periodicTableModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs__',
      buildDir: '/tmp/__no_such_build__',
    });
  });
});