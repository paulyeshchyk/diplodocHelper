import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cleanBuildModule } from './cleanBuild.module.ts';

describe('cleanBuild.module', () => {
  it('00.7.2#98 should have correct metadata', () => {
    expect(cleanBuildModule.name).toBe('cleanBuild');
    expect(cleanBuildModule.phase).toBe('pre');
    expect(cleanBuildModule.defaultOrder).toBe(5);
    expect(cleanBuildModule.args).toEqual([]);
  });

  it('00.7.2#99 should lazy-load ModuleImpl', async () => {
    const impl = await cleanBuildModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#100 should remove existing buildDir', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean-build-'));
    try {
      fs.mkdirSync(path.join(tmp, 'sub'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'sub', 'x.txt'), 'x');
      const impl = await cleanBuildModule.load();
      await impl.run({ buildDir: tmp });
      expect(fs.existsSync(tmp)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('00.7.2#101 should not throw for non-existent buildDir', async () => {
    const impl = await cleanBuildModule.load();
    await impl.run({ buildDir: '/tmp/__no_such_build__' });
  });
});