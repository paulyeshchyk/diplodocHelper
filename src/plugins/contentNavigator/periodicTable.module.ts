import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Fn = (opts: { mapDir: string; outputDir: string; command: string; docsDir: string }) => void;

async function loadFn(): Promise<Fn> {
  const mod = await import('./generateNavigationContent.js');
  const m = mod as unknown as { runGeneration: Fn; default?: { runGeneration: Fn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const periodicTableModule: ModuleDef = {
  name: 'periodicTable',
  description: 'Генерирует bytescounter.html (матрица размеров статей)',
  phase: 'post',
  defaultOrder: 55,
  args: [],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const outputDir = resolveBuildDir(opts);
        runGeneration({
          mapDir: outputDir,
          outputDir,
          command: 'periodicTable',
          docsDir: resolveDocsDir(opts),
        });
      },
    };
  },
};