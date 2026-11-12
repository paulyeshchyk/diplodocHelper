import { describe, expect, it } from '@jest/globals';
import { emitModulesTableModule } from './emit-modules-table.module.ts';

describe('emit-modules-table.module', () => {
  it('00.7.2#10 should have correct metadata', () => {
    expect(emitModulesTableModule.name).toBe('emitModulesTable');
    expect(emitModulesTableModule.phase).toBe('pre');
    expect(emitModulesTableModule.defaultOrder).toBe(40);
  });

  it('00.7.2#11 should lazy-load ModuleImpl', async () => {
    const impl = await emitModulesTableModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#12 should declare expected flags', () => {
    const flags = emitModulesTableModule.args.map(a => a.flag);
    expect(flags).toContain('--anchor');
    expect(flags).toContain('--out-dir');
  });
});