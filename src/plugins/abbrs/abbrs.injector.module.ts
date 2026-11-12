import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Results = { success: string[]; failed: string[] };
type InjectFn = (opts: { buildDir: string; docsRoot: string }) => Results;

async function loadFn(): Promise<InjectFn> {
  const mod = await import('./abbrs.injector.js');
  const m = mod as unknown as { runGeneration: InjectFn; default?: { runGeneration: InjectFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const abbrTitlesModule: ModuleDef = {
  name: 'abbrTitles',
  description: 'Инжектит tooltip в <abbr> в HTML',
  phase: 'post',
  defaultOrder: 10,
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
            `[abbrTitles] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем)`,
          );
        }
      },
    };
  },
};