import { describe, expect, it } from '@jest/globals';
import { footnoteNumberingModule } from './footnoteNumbering.module.ts';

describe('footnoteNumbering.module', () => {
  it('00.7.2#61 should have correct metadata', () => {
    expect(footnoteNumberingModule.name).toBe('footnoteNumbering');
    expect(footnoteNumberingModule.phase).toBe('post');
    expect(footnoteNumberingModule.defaultOrder).toBe(25);
    expect(footnoteNumberingModule.args).toEqual([]);
  });

  it('00.7.2#62 should lazy-load ModuleImpl', async () => {
    const impl = await footnoteNumberingModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#63 should not throw for empty docsDir/buildDir', async () => {
    const impl = await footnoteNumberingModule.load();
    // renumberFootnotes не бросает на пустом toc.yaml → вернёт success:true, total:0
    await impl.run({
      docsDir: '/tmp/__no_such_docs_dir__',
      buildDir: '/tmp/__no_such_build_dir__',
    });
  });
});