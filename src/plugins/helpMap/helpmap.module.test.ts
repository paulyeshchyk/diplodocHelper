import { describe, expect, it } from '@jest/globals';
import { helpMapModule } from './helpmap.module.ts';

describe('helpMap.module', () => {
  it('00.7.2#28 should have correct metadata', () => {
    expect(helpMapModule.name).toBe('helpMap');
    expect(helpMapModule.phase).toBe('pre');
    expect(helpMapModule.defaultOrder).toBe(62);
    expect(helpMapModule.args.map(a => a.flag)).toContain('--segregation');
  });

  it('00.7.2#29 should lazy-load ModuleImpl', async () => {
    const impl = await helpMapModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#30 should not throw for empty docsDir', async () => {
    const impl = await helpMapModule.load();
    await impl.run({
      docsDir: '/tmp/__no_such_docs_dir__',
      buildDir: '/tmp/__no_such_build_dir__',
    });
  });
});