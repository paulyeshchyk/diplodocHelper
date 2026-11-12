import { resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type GenerateFiguresFn = (docsRoot: string) => Promise<{ success: string[]; failed: string[] }>;

async function loadFn(): Promise<GenerateFiguresFn> {
  const mod = await import('./figures.js');
  const m = mod as unknown as { runGeneration: GenerateFiguresFn; default?: { runGeneration: GenerateFiguresFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const createFigureContentModule: ModuleDef = {
  name: 'createFigureContent',
  description: 'Генерирует перечень иллюстраций (figures/index.md)',
  phase: 'pre',
  defaultOrder: 69,
  args: [],
  async load() {
    const generateFigures = await loadFn();
    return {
      async run(opts) {
        const docsRoot = resolveDocsDir(opts);
        const results = await generateFigures(docsRoot);
        if (results.success.length === 0) {
          console.warn(
            `[createFigureContent] ни одного языка не обработано ` +
            `(failed: ${results.failed.join(', ') || '—'}; legacy-контракт: не падаем, Contributing §8)`,
          );
        }
      },
    };
  },
};