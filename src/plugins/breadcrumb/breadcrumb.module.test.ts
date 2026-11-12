import { describe, expect, it } from '@jest/globals';
import { breadcrumbModule } from './breadcrumb.module.ts';

describe('breadcrumb.module', () => {
  it('00.7.2#73 should have correct metadata', () => {
    expect(breadcrumbModule.name).toBe('breadcrumb');
    expect(breadcrumbModule.phase).toBe('post');
    expect(breadcrumbModule.defaultOrder).toBe(35);
    expect(breadcrumbModule.args).toEqual([]);
  });

  it('00.7.2#74 should lazy-load ModuleImpl', async () => {
    const impl = await breadcrumbModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#75 should throw for non-existent buildDir', async () => {
    const impl = await breadcrumbModule.load();
    await expect(
      impl.run({ buildDir: '/tmp/__no_such_build__' }),
    ).rejects.toThrow(/breadcrumb failed/);
  });
});