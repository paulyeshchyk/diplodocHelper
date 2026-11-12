import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cleanupServiceFilesModule } from './cleanupServiceFiles.module.ts';

describe('cleanupServiceFiles.module', () => {
  it('00.7.2#108 should have correct metadata', () => {
    expect(cleanupServiceFilesModule.name).toBe('cleanupServiceFiles');
    expect(cleanupServiceFilesModule.phase).toBe('post');
    expect(cleanupServiceFilesModule.defaultOrder).toBe(99);
    expect(cleanupServiceFilesModule.args).toEqual([]);
  });

  it('00.7.2#109 should lazy-load ModuleImpl', async () => {
    const impl = await cleanupServiceFilesModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#110 should remove .yfm* service files from buildDir', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-svc-'));
    try {
      fs.writeFileSync(path.join(tmp, '.yfm'), 'x');
      fs.writeFileSync(path.join(tmp, '.yfmignore'), 'x');
      fs.writeFileSync(path.join(tmp, '.yfmlint'), 'x');
      fs.writeFileSync(path.join(tmp, 'index.html'), '<html/>');

      const impl = await cleanupServiceFilesModule.load();
      await impl.run({ buildDir: tmp });

      expect(fs.existsSync(path.join(tmp, '.yfm'))).toBe(false);
      expect(fs.existsSync(path.join(tmp, '.yfmignore'))).toBe(false);
      expect(fs.existsSync(path.join(tmp, '.yfmlint'))).toBe(false);
      expect(fs.existsSync(path.join(tmp, 'index.html'))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('00.7.2#111 should not throw for non-existent buildDir', async () => {
    const impl = await cleanupServiceFilesModule.load();
    await impl.run({ buildDir: '/tmp/__no_such_build__' });
  });
});