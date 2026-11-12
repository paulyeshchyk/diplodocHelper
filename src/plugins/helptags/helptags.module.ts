import { resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Results = { success: string[]; failed: string[] };
type GenFn = (docsRoot: string) => Results;

async function loadFn(): Promise<GenFn> {
  const mod = await import('./helptags.js');
  const m = mod as unknown as { runGeneration: GenFn; default?: { runGeneration: GenFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const helptagsModule: ModuleDef = {
  name: 'helptags',
  description: 'Собирает страницу хелптэгов (helptags/index.md)',
  phase: 'pre',
  defaultOrder: 65,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const results = runGeneration(resolveDocsDir(opts));
        if (results.success.length === 0) {
          console.warn(
            `[helptags] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем, Contributing §8)`,
          );
        }
      },
    };
  },
};