import { describe, expect, it } from '@jest/globals';
import { reindexFiguresModule } from './reindexer.figures.module.ts';

describe('reindexFigures.module', () => {
  it('00.7.2#16 should have correct metadata', () => {
    expect(reindexFiguresModule.name).toBe('reindexFigures');
    expect(reindexFiguresModule.phase).toBe('pre');
    expect(reindexFiguresModule.defaultOrder).toBe(60);
    expect(reindexFiguresModule.args).toEqual([]);
  });

  it('00.7.2#17 should lazy-load ModuleImpl', async () => {
    const impl = await reindexFiguresModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#18 should throw when reindexer returns success=false', async () => {
    // no toc.yaml в tmp → reindexFigures вернёт success=false, reason='no_toc'
    const impl = await reindexFiguresModule.load();
    await expect(
      impl.run({ lang: 'ru', docsDir: '/tmp/__no_such_docs_dir__' }),
    ).rejects.toThrow(/reindexFigures/);
  });
});