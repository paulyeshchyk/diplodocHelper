import { describe, expect, it } from '@jest/globals';
import { reindexFootnotesModule } from './reindexer.footnotes.module.ts';

describe('reindexFootnotes.module', () => {
  it('00.7.2#19 should have correct metadata', () => {
    expect(reindexFootnotesModule.name).toBe('reindexFootnotes');
    expect(reindexFootnotesModule.phase).toBe('pre');
    expect(reindexFootnotesModule.defaultOrder).toBe(61);
    expect(reindexFootnotesModule.args).toEqual([]);
  });

  it('00.7.2#20 should lazy-load ModuleImpl', async () => {
    const impl = await reindexFootnotesModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#21 should throw when rootDir does not exist', async () => {
    const impl = await reindexFootnotesModule.load();
    await expect(
      impl.run({ lang: 'ru', docsDir: '/tmp/__no_such_docs_dir__' }),
    ).rejects.toThrow(/reindexFootnotes/);
  });
});