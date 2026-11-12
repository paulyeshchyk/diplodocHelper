import { describe, expect, it } from '@jest/globals';
import { buildPageLegendModule } from './build-page-legend.module.ts';

describe('build-page-legend.module', () => {
  it('00.7.2#04 should have correct metadata', () => {
    expect(buildPageLegendModule.name).toBe('buildPageLegend');
    expect(buildPageLegendModule.phase).toBe('pre');
    expect(buildPageLegendModule.defaultOrder).toBe(20);
    expect(buildPageLegendModule.dependsOn).toContain('collectCatalog');
  });

  it('00.7.2#05 should lazy-load ModuleImpl', async () => {
    const impl = await buildPageLegendModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#06 should declare expected flags', () => {
    const flags = buildPageLegendModule.args.map(a => a.flag);
    expect(flags).toContain('--rewrite');
    expect(flags).toContain('--with-include');
    expect(flags).toContain('--order');
  });
});