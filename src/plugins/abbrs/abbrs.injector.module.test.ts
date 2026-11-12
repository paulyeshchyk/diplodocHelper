import { describe, expect, it } from '@jest/globals';
import { abbrTitlesModule } from './abbrs.injector.module.ts';

describe('abbrTitles.module', () => {
  it('00.7.2#34 should have correct metadata', () => {
    expect(abbrTitlesModule.name).toBe('abbrTitles');
    expect(abbrTitlesModule.phase).toBe('post');
    expect(abbrTitlesModule.defaultOrder).toBe(10);
    expect(abbrTitlesModule.args).toEqual([]);
  });

  it('00.7.2#35 should lazy-load ModuleImpl', async () => {
    const impl = await abbrTitlesModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#36 should not throw for empty buildDir', async () => {
    const impl = await abbrTitlesModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs_dir__',
      buildDir: '/tmp/__no_such_build_dir__',
    });
  });
});