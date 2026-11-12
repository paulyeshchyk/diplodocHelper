import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { roadMapModule } from './roadMap.module.ts';

describe('roadMap.module', () => {
  it('00.7.2#94 should have correct metadata', () => {
    expect(roadMapModule.name).toBe('roadMap');
    expect(roadMapModule.phase).toBe('pre');
    expect(roadMapModule.defaultOrder).toBe(70);
    const flags = roadMapModule.args.map(a => a.flag);
    expect(flags).toContain('--data-path');
    expect(flags).toContain('--dataPath');
    expect(flags).toContain('--engine');
  });

  it('00.7.2#95 should lazy-load ModuleImpl', async () => {
    const impl = await roadMapModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#96 should throw when docsDir does not exist', async () => {
    const impl = await roadMapModule.load();
    await expect(
      impl.run({ docsDir: '/tmp/__no_such_docs__', engine: 'mermaid' }),
    ).rejects.toThrow(/docsDir не найден/);
  });

  it('00.7.2#97 should not throw for existing docsDir without ru/en subdirs', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'roadmap-'));
    try {
      const impl = await roadMapModule.load();
      await impl.run({ docsDir: tmp, engine: 'mermaid' });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});