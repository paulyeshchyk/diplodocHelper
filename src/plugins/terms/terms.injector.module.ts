import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Results = { success: string[]; failed: string[] };
type InjectFn = (opts: { buildDir: string; docsRoot: string }) => Results;

async function loadFn(): Promise<InjectFn> {
  const mod = await import('./terms.injector.js');
  const m = mod as unknown as { runGeneration: InjectFn; default?: { runGeneration: InjectFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const termTitlesModule: ModuleDef = {
  name: 'termTitles',
  description: 'Инжектит tooltip в <abbr class="term"> в HTML',
  phase: 'post',
  defaultOrder: 20,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration({
          buildDir: resolveBuildDir(opts),
          docsRoot: resolveDocsDir(opts),
        });
        if (results.success.length === 0) {
          console.warn(
            `[termTitles] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем)`,
          );
        }
      },
    };
  },
};