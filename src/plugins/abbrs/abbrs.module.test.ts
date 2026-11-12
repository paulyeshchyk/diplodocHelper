import { describe, expect, it } from '@jest/globals';
import { abbrsModule } from './abbrs.module.ts';

describe('abbrs.module', () => {
  it('00.7.2#31 should have correct metadata', () => {
    expect(abbrsModule.name).toBe('abbrs');
    expect(abbrsModule.phase).toBe('pre');
    expect(abbrsModule.defaultOrder).toBe(66);
    expect(abbrsModule.args).toEqual([]);
  });

  it('00.7.2#32 should lazy-load ModuleImpl', async () => {
    const impl = await abbrsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#33 should not throw for empty docsDir (no lang subdirs)', async () => {
    const impl = await abbrsModule.load();
    await impl.run({ docsDir: '/tmp/__no_such_docs_dir__' });
  });
});