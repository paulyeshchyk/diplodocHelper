import { describe, expect, it, jest } from '@jest/globals';
import { helptagsModule } from './helptags.module.ts';

describe('helptags.module', () => {
  it('00.7.2#52 should have correct metadata', () => {
    expect(helptagsModule.name).toBe('helptags');
    expect(helptagsModule.phase).toBe('pre');
    expect(helptagsModule.defaultOrder).toBe(65);
    expect(helptagsModule.args).toEqual([]);
  });

  it('00.7.2#53 should lazy-load ModuleImpl', async () => {
    const impl = await helptagsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#54 should warn (not throw) when no languages processed (legacy contract)', async () => {
    const impl = await helptagsModule.load();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => { });
    try {
      await impl.run({ docsDir: '/tmp/__no_such_docs_dir__' });
      // не падаем на «нет данных»; хелптэги в этом репо пустые
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});