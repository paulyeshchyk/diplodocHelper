import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Fn = (opts: { mapDir: string; outputDir: string; command: string; docsDir: string }) => void;

async function loadFn(): Promise<Fn> {
  const mod = await import('./generateNavigationContent.js');
  const m = mod as unknown as { runGeneration: Fn; default?: { runGeneration: Fn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const periodicTableContextModule: ModuleDef = {
  name: 'periodicTableContext',
  description: 'Генерирует contextmap.html (матрица контекстов)',
  phase: 'post',
  defaultOrder: 65,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const outputDir = resolveBuildDir(opts);
        runGeneration({
          mapDir: outputDir,
          outputDir,
          command: 'periodicTableContext',
          docsDir: resolveDocsDir(opts),
        });
      },
    };
  },
};