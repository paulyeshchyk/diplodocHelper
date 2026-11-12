import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Results = { success: string[]; failed: string[] };
type Fn = (buildDir: string) => Results;

async function loadFn(): Promise<Fn> {
  const mod = await import('./fix-footnote-anchors.js');
  const m = mod as unknown as { fixFootnoteAnchors: Fn; default?: { fixFootnoteAnchors: Fn } };
  return m.fixFootnoteAnchors ?? m.default!.fixFootnoteAnchors;
}

export const footnoteAnchorsModule: ModuleDef = {
  name: 'footnoteAnchors',
  description: 'Правит якоря сносок в HTML (canonical URL)',
  phase: 'post',
  defaultOrder: 5,
  args: [],
  async load() {
    const fixFootnoteAnchors = await loadFn();
    return {
      async run(opts) {
        const results = fixFootnoteAnchors(resolveBuildDir(opts));
        if (results.success.length === 0 && results.failed.length > 0) {
          throw new Error(`footnoteAnchors failed for: ${results.failed.join(', ')}`);
        }
      },
    };
  },
};