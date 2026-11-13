import { resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';
import { createLogger } from '../utils/logger/index.ts';

type Results = { success: string[]; failed: string[] };
type GenFn = (docsRoot: string) => Results;

async function loadFn(): Promise<GenFn> {
  const mod = await import('./abbrs.js');
  const m = mod as unknown as { runGeneration: GenFn; default?: { runGeneration: GenFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const abbrsModule: ModuleDef = {
  name: 'abbrs',
  description: 'Собирает список сокращений (abbrs/index.md)',
  phase: 'pre',
  defaultOrder: 66,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration(resolveDocsDir(opts));
        if (results.success.length === 0) {
          createLogger('abbrs', opts).warn(
            `[abbrs] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем)`,
          );
        }
      },
    };
  },
};