import { describe, expect, it } from '@jest/globals';
import { contexttagsModule } from './context-tags.module.ts';

describe('contexttags.module', () => {
  it('00.7.2#55 should have correct metadata', () => {
    expect(contexttagsModule.name).toBe('contexttags');
    expect(contexttagsModule.phase).toBe('post');
    expect(contexttagsModule.defaultOrder).toBe(40);
    expect(contexttagsModule.args).toEqual([]);
  });

  it('00.7.2#56 should lazy-load ModuleImpl', async () => {
    const impl = await contexttagsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#57 should throw for non-existent buildDir', async () => {
    const impl = await contexttagsModule.load();
    await expect(
      impl.run({ buildDir: '/tmp/__no_such_build_dir__' }),
    ).rejects.toThrow(/contexttags failed/);
  });
});