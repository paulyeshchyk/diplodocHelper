import { describe, expect, it } from '@jest/globals';
import { tocCleanModeModule } from './tocCleanMode.module.ts';

describe('tocCleanMode.module', () => {
  it('00.7.2#67 should have correct metadata', () => {
    expect(tocCleanModeModule.name).toBe('tocCleanMode');
    expect(tocCleanModeModule.phase).toBe('post');
    expect(tocCleanModeModule.defaultOrder).toBe(70);
    expect(tocCleanModeModule.args).toEqual([]);
  });

  it('00.7.2#68 should lazy-load ModuleImpl', async () => {
    const impl = await tocCleanModeModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#69 should throw for non-existent buildDir (fs.readdirSync ENOENT)', async () => {
    const impl = await tocCleanModeModule.load();
    await expect(
      impl.run({ buildDir: '/tmp/__no_such_build_dir__' }),
    ).rejects.toThrow(/ENOENT/);
  });
});