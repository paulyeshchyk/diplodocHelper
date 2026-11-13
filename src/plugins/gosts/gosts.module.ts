import { resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';
import { createLogger } from '../utils/logger/index.ts';

type Results = { success: string[]; failed: string[] };
type GenFn = (docsRoot: string) => Results;

async function loadFn(): Promise<GenFn> {
  const mod = await import('./gosts.js');
  const m = mod as unknown as { runGeneration: GenFn; default?: { runGeneration: GenFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const gostsModule: ModuleDef = {
  name: 'gosts',
  description: 'Собирает справочник ГОСТов (gosts/index.md)',
  phase: 'pre',
  defaultOrder: 68,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration(resolveDocsDir(opts));
        if (results.success.length === 0) {
          createLogger('gosts', opts).warn(
            `[gosts] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем)`,
          );
        }
      },
    };
  },
};