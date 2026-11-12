import { describe, expect, it } from '@jest/globals';
import { collectCatalogModule } from './collect-catalog.module.ts';

describe('collect-catalog.module', () => {
  it('00.7.2#01 should have correct metadata', () => {
    expect(collectCatalogModule.name).toBe('collectCatalog');
    expect(collectCatalogModule.phase).toBe('pre');
    expect(collectCatalogModule.defaultOrder).toBe(10);
    expect(collectCatalogModule.description).toMatch(/catalog/i);
  });

  it('00.7.2#02 should lazy-load ModuleImpl', async () => {
    const impl = await collectCatalogModule.load();
    expect(impl).toBeDefined();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#03 should declare expected flags', () => {
    const flags = collectCatalogModule.args.map(a => a.flag);
    expect(flags).toContain('--module-prefix');
    expect(flags).toContain('--lenient');
    expect(flags).toContain('--probe');
    expect(flags).toContain('--registry');
  });
});