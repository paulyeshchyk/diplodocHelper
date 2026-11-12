import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Results = { success: string[]; failed: string[] };
type GenFn = (buildDir: string) => Results;

async function loadFn(): Promise<GenFn> {
  const mod = await import('./context-tags.js');
  const m = mod as unknown as { runGeneration: GenFn; default?: { runGeneration: GenFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const contexttagsModule: ModuleDef = {
  name: 'contexttags',
  description: 'Инжектит теги контекстов в HTML',
  phase: 'post',
  defaultOrder: 40,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration(resolveBuildDir(opts));
        if (results.success.length === 0 && results.failed.length > 0) {
          throw new Error(`contexttags failed: ${results.failed.join(', ')}`);
        }
      },
    };
  },
};