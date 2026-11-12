import { describe, expect, it } from '@jest/globals';
import { periodicTableContextModule } from './periodicTableContext.module.ts';

describe('periodicTableContext.module', () => {
  it('00.7.2#91 should have correct metadata', () => {
    expect(periodicTableContextModule.name).toBe('periodicTableContext');
    expect(periodicTableContextModule.phase).toBe('post');
    expect(periodicTableContextModule.defaultOrder).toBe(65);
    expect(periodicTableContextModule.args).toEqual([]);
  });

  it('00.7.2#92 should lazy-load ModuleImpl', async () => {
    const impl = await periodicTableContextModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#93 should not throw for empty dirs', async () => {
    const impl = await periodicTableContextModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs__',
      buildDir: '/tmp/__no_such_build__',
    });
  });
});