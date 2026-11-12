import { describe, expect, it } from '@jest/globals';
import { periodicTableHelpTagModule } from './periodicTableHelpTag.module.ts';

describe('periodicTableHelpTag.module', () => {
  it('00.7.2#88 should have correct metadata', () => {
    expect(periodicTableHelpTagModule.name).toBe('periodicTableHelpTag');
    expect(periodicTableHelpTagModule.phase).toBe('post');
    expect(periodicTableHelpTagModule.defaultOrder).toBe(60);
    expect(periodicTableHelpTagModule.args).toEqual([]);
  });

  it('00.7.2#89 should lazy-load ModuleImpl', async () => {
    const impl = await periodicTableHelpTagModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#90 should not throw for empty dirs', async () => {
    const impl = await periodicTableHelpTagModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs__',
      buildDir: '/tmp/__no_such_build__',
    });
  });
});