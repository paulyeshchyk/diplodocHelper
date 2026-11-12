import { describe, expect, it } from '@jest/globals';
import { copyMdeditFixesModule } from './copyMdeditFixes.module.ts';

describe('copyMdeditFixes.module', () => {
  it('00.7.2#105 should have correct metadata', () => {
    expect(copyMdeditFixesModule.name).toBe('copyMdeditFixes');
    expect(copyMdeditFixesModule.phase).toBe('post');
    expect(copyMdeditFixesModule.defaultOrder).toBe(32);
    expect(copyMdeditFixesModule.args).toEqual([]);
  });

  it('00.7.2#106 should lazy-load ModuleImpl', async () => {
    const impl = await copyMdeditFixesModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#107 should throw when mdedit_fixes source not found', async () => {
    const impl = await copyMdeditFixesModule.load();
    await expect(
      impl.run({
        projectRoot: '/tmp/__no_such_project__',
        buildDir: '/tmp/__no_such_build__',
      }),
    ).rejects.toThrow(/mdedit_fixes не найден/);
  });
});