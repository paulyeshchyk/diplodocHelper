import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { featureMapInjectModule } from './feature-map.injector.module.ts';

describe('featureMapInject.module', () => {
  it('00.7.2#70 should have correct metadata', () => {
    expect(featureMapInjectModule.name).toBe('featureMapInject');
    expect(featureMapInjectModule.phase).toBe('post');
    expect(featureMapInjectModule.defaultOrder).toBe(2);
    expect(featureMapInjectModule.args.map(a => a.flag)).toContain('--plugin-dir');
  });

  it('00.7.2#71 should lazy-load ModuleImpl', async () => {
    const impl = await featureMapInjectModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#72 should throw ENOENT when explicit pluginDir is invalid and buildDir exists', async () => {
    const tmpBuild = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-build-'));
    try {
      const impl = await featureMapInjectModule.load();
      // buildDir существует → runGeneration доходит до fs.readFileSync(pluginDir/*)
      // → ENOENT на feature-map.css.
      await expect(
        impl.run({
          buildDir: tmpBuild,
          pluginDir: '/tmp/__no_such_plugin_dir__',
        }),
      ).rejects.toThrow(/ENOENT|feature-map\.(css|client\.js)/);
    } finally {
      fs.rmSync(tmpBuild, { recursive: true, force: true });
    }
  });

  it('00.7.2#97 should throw "featureMapInject failed" for non-existent buildDir', async () => {
    const impl = await featureMapInjectModule.load();
    // buildDir не существует → runGeneration возвращает { failed: [buildDir] }
    // → модуль бросает обёртку с путём.
    await expect(
      impl.run({ buildDir: '/tmp/__no_such_build__' }),
    ).rejects.toThrow(/featureMapInject failed/);
  });
});