import { describe, expect, it } from '@jest/globals';
import { contextsModule } from './contexts.module.ts';

describe('contexts.module', () => {
  it('00.7.2#49 should have correct metadata', () => {
    expect(contextsModule.name).toBe('contexts');
    expect(contextsModule.phase).toBe('pre');
    expect(contextsModule.defaultOrder).toBe(64);
    expect(contextsModule.args).toEqual([]);
  });

  it('00.7.2#50 should lazy-load ModuleImpl', async () => {
    const impl = await contextsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#51 should not throw for empty docsDir', async () => {
    const impl = await contextsModule.load();
    await impl.run({ docsDir: '/tmp/__no_such_docs_dir__' });
  });
});