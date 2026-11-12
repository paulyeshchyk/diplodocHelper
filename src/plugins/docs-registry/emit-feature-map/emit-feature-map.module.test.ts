import { describe, expect, it } from '@jest/globals';
import { emitFeatureMapModule } from './emit-feature-map.module.ts';

describe('emit-feature-map.module', () => {
  it('00.7.2#13 should have correct metadata', () => {
    expect(emitFeatureMapModule.name).toBe('emitFeatureMap');
    expect(emitFeatureMapModule.phase).toBe('pre');
    expect(emitFeatureMapModule.defaultOrder).toBe(50);
  });

  it('00.7.2#14 should lazy-load ModuleImpl', async () => {
    const impl = await emitFeatureMapModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#15 should declare expected flags', () => {
    const flags = emitFeatureMapModule.args.map(a => a.flag);
    expect(flags).toContain('--catalog');
    expect(flags).toContain('--config');
    expect(flags).toContain('--out');
  });
});