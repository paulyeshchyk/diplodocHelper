import { describe, expect, it } from '@jest/globals';
import { createFigureContentModule } from './figures.module.ts';

describe('createFigureContent.module', () => {
  it('00.7.2#22 should have correct metadata', () => {
    expect(createFigureContentModule.name).toBe('createFigureContent');
    expect(createFigureContentModule.phase).toBe('pre');
    expect(createFigureContentModule.defaultOrder).toBe(69);
    expect(createFigureContentModule.args).toEqual([]);
  });

  it('00.7.2#23 should lazy-load ModuleImpl', async () => {
    const impl = await createFigureContentModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#24 should not throw for empty docsDir (no lang subdirs)', async () => {
    const impl = await createFigureContentModule.load();
    // фиктивная папка, без ru/en — generateFigures вернёт { success: [], failed: [] }
    await impl.run({ docsDir: '/tmp/__no_such_docs_dir__' });
  });
});