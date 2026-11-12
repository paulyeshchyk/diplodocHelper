import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Fn = (buildDir: string) => { success: string[]; failed: string[] };

async function loadFn(): Promise<Fn> {
  const mod = await import('./breadcrumb.js');
  const m = mod as unknown as { runGeneration: Fn; default?: { runGeneration: Fn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const breadcrumbModule: ModuleDef = {
  name: 'breadcrumb',
  description: 'Инжектит хлебные крошки в HTML',
  phase: 'post',
  defaultOrder: 35,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration(resolveBuildDir(opts));
        if (results.failed.length > 0) {
          throw new Error(`breadcrumb failed: ${results.failed.join(', ')}`);
        }
      },
    };
  },
};