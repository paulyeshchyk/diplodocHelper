import { describe, expect, it } from '@jest/globals';
import { footnoteAnchorsModule } from './footnoteAnchors.module.ts';

describe('footnoteAnchors.module', () => {
  it('00.7.2#58 should have correct metadata', () => {
    expect(footnoteAnchorsModule.name).toBe('footnoteAnchors');
    expect(footnoteAnchorsModule.phase).toBe('post');
    expect(footnoteAnchorsModule.defaultOrder).toBe(5);
    expect(footnoteAnchorsModule.args).toEqual([]);
  });

  it('00.7.2#59 should lazy-load ModuleImpl', async () => {
    const impl = await footnoteAnchorsModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#60 should throw for non-existent buildDir', async () => {
    const impl = await footnoteAnchorsModule.load();
    await expect(
      impl.run({ buildDir: '/tmp/__no_such_build_dir__' }),
    ).rejects.toThrow(/footnoteAnchors failed/);
  });
});