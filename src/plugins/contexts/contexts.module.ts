import { resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Results = { success: string[]; failed: string[] };
type GenFn = (docsRoot: string) => Results;

async function loadFn(): Promise<GenFn> {
  const mod = await import('./сontexts.js');
  const m = mod as unknown as { runGeneration: GenFn; default?: { runGeneration: GenFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const contextsModule: ModuleDef = {
  name: 'contexts',
  description: 'Собирает страницу контекстов (contexts/index.md)',
  phase: 'pre',
  defaultOrder: 64,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration(resolveDocsDir(opts));
        if (results.success.length === 0) {
          console.warn(
            `[contexts] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем)`,
          );
        }
      },
    };
  },
};