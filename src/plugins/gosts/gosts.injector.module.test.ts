import { describe, expect, it } from '@jest/globals';
import { gostsInjectModule } from './gosts.injector.module.ts';

describe('gostsInject.module', () => {
  it('00.7.2#46 should have correct metadata', () => {
    expect(gostsInjectModule.name).toBe('gostsInject');
    expect(gostsInjectModule.phase).toBe('post');
    expect(gostsInjectModule.defaultOrder).toBe(30);
    const flags = gostsInjectModule.args.map(a => a.flag);
    expect(flags).toContain('--section');
    expect(flags).toContain('--targetHtml');
    expect(flags).toContain('--outputDir');
  });

  it('00.7.2#47 should lazy-load ModuleImpl', async () => {
    const impl = await gostsInjectModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#48 should throw when targetHtml cannot be resolved', async () => {
    const impl = await gostsInjectModule.load();
    await expect(
      impl.run({
        docsDir: '/tmp/__no_such_docs_dir__',
        buildDir: '/tmp/__no_such_build_dir__',
        section: 'ГОСТы',
      }),
    ).rejects.toThrow(/HTML файл не найден/);
  });
});