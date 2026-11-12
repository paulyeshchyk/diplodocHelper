import { describe, expect, it } from '@jest/globals';
import { termsModule } from './terms.module.ts';

describe('terms.module', () => {
  it('00.7.2#37 should have correct metadata', () => {
    expect(termsModule.name).toBe('terms');
    expect(termsModule.phase).toBe('pre');
    expect(termsModule.defaultOrder).toBe(67);
    expect(termsModule.args).toEqual([]);
  });

  it('00.7.2#38 should lazy-load ModuleImpl', async () => {
    const impl = await termsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#39 should not throw for empty docsDir', async () => {
    const impl = await termsModule.load();
    await impl.run({ docsDir: '/tmp/__no_such_docs_dir__' });
  });
});