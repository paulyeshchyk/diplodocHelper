import { describe, expect, it } from '@jest/globals';
import { footnoteListModule } from './footnoteList.module.ts';

describe('footnoteList.module', () => {
  it('00.7.2#64 should have correct metadata', () => {
    expect(footnoteListModule.name).toBe('footnoteList');
    expect(footnoteListModule.phase).toBe('post');
    expect(footnoteListModule.defaultOrder).toBe(26);
    const flags = footnoteListModule.args.map(a => a.flag);
    expect(flags).toContain('--section');
    expect(flags).toContain('--targetHtml');
  });

  it('00.7.2#65 should lazy-load ModuleImpl', async () => {
    const impl = await footnoteListModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#66 should throw when neither --section nor --targetHtml', async () => {
    const impl = await footnoteListModule.load();
    await expect(
      impl.run({ docsDir: '/tmp/__x__', buildDir: '/tmp/__no_such_build_dir__' }),
    ).rejects.toThrow(/нужен --section или --targetHtml/);
  });
});