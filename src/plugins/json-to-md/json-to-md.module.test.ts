import { describe, expect, it } from '@jest/globals';
import { jsonToMdTableModule } from './json-to-md.module.ts';

describe('jsonToMdTable.module', () => {
  it('00.7.2#25 should have correct metadata', () => {
    expect(jsonToMdTableModule.name).toBe('jsonToMdTable');
    expect(jsonToMdTableModule.phase).toBe('pre');
    expect(jsonToMdTableModule.defaultOrder).toBe(90);
  });

  it('00.7.2#26 should lazy-load ModuleImpl', async () => {
    const impl = await jsonToMdTableModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#27 should declare all 23 flags', () => {
    const flags = jsonToMdTableModule.args.map(a => a.flag);
    expect(flags).toContain('--jsonPath');
    expect(flags).toContain('--tableType');
    expect(flags).toContain('--groupBy');
    expect(flags).toContain('--rowField');
    expect(flags).toContain('--flat');
    expect(flags).toHaveLength(23);
  });
});