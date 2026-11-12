import { describe, expect, it } from '@jest/globals';
import { termTitlesModule } from './terms.injector.module.ts';

describe('termTitles.module', () => {
  it('00.7.2#40 should have correct metadata', () => {
    expect(termTitlesModule.name).toBe('termTitles');
    expect(termTitlesModule.phase).toBe('post');
    expect(termTitlesModule.defaultOrder).toBe(20);
    expect(termTitlesModule.args).toEqual([]);
  });

  it('00.7.2#41 should lazy-load ModuleImpl', async () => {
    const impl = await termTitlesModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#42 should not throw for empty buildDir', async () => {
    const impl = await termTitlesModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs_dir__',
      buildDir: '/tmp/__no_such_build_dir__',
    });
  });
});