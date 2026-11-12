import { describe, expect, it } from '@jest/globals';
import { gostsModule } from './gosts.module.ts';

describe('gosts.module', () => {
  it('00.7.2#43 should have correct metadata', () => {
    expect(gostsModule.name).toBe('gosts');
    expect(gostsModule.phase).toBe('pre');
    expect(gostsModule.defaultOrder).toBe(68);
    expect(gostsModule.args).toEqual([]);
  });

  it('00.7.2#44 should lazy-load ModuleImpl', async () => {
    const impl = await gostsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#45 should not throw for empty docsDir', async () => {
    const impl = await gostsModule.load();
    await impl.run({ docsDir: '/tmp/__no_such_docs_dir__' });
  });
});