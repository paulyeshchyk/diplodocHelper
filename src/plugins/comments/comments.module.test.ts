import { describe, expect, it } from '@jest/globals';
import { commentsModule } from './comments.module.ts';

describe('comments.module', () => {
  it('00.7.2#76 should have correct metadata', () => {
    expect(commentsModule.name).toBe('comments');
    expect(commentsModule.phase).toBe('post');
    expect(commentsModule.defaultOrder).toBe(45);
    expect(commentsModule.args).toEqual([]);
  });

  it('00.7.2#77 should lazy-load ModuleImpl', async () => {
    const impl = await commentsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#78 should not throw for non-existent buildDir (legacy injector swallows)', async () => {
    const impl = await commentsModule.load();
    // comments.injector.runGeneration на несуществующем buildDir
    // возвращает { success: [], failed: [] } и логирует console.error.
    // Модуль корректно не падает — guard остаётся на injector'е.
    await impl.run({ buildDir: '/tmp/__no_such_build__' });
  });
});