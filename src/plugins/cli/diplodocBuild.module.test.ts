import { describe, expect, it } from '@jest/globals';
import { diplodocBuildModule } from './diplodocBuild.module.ts';

describe('diplodocBuild.module', () => {
  it('00.7.2#102 should have correct metadata', () => {
    expect(diplodocBuildModule.name).toBe('diplodocBuild');
    expect(diplodocBuildModule.phase).toBe('build');
    expect(diplodocBuildModule.defaultOrder).toBe(10);
    const flags = diplodocBuildModule.args.map(a => a.flag);
    expect(flags).toContain('--input');
    expect(flags).toContain('--output');
    expect(flags).toContain('--preset');
  });

  it('00.7.2#103 should lazy-load ModuleImpl', async () => {
    const impl = await diplodocBuildModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#104 should throw when npx @diplodoc/cli exits non-zero', async () => {
    const impl = await diplodocBuildModule.load();
    // Несуществующий input → npx @diplodoc/cli упадёт (или npx не найдёт пакет);
    // в любом случае spawnSync вернёт status != 0.
    await expect(
      impl.run({
        input: '/tmp/__no_such_input__',
        output: '/tmp/__no_such_output__',
      }),
    ).rejects.toThrow(/diplodocBuild/);
  });
});