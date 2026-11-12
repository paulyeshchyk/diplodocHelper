import { describe, expect, it } from '@jest/globals';
import { renderModulesModule } from './render-modules.module.ts';

describe('render-modules.module', () => {
  it('00.7.2#07 should have correct metadata', () => {
    expect(renderModulesModule.name).toBe('renderModules');
    expect(renderModulesModule.phase).toBe('pre');
    expect(renderModulesModule.defaultOrder).toBe(30);
  });

  it('00.7.2#08 should lazy-load ModuleImpl', async () => {
    const impl = await renderModulesModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#09 should declare expected flags', () => {
    const flags = renderModulesModule.args.map(a => a.flag);
    expect(flags).toContain('--out-name');
    expect(flags).toContain('--anchor');
  });
});