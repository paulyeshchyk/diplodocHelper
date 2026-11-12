import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

interface HelpMapResults {
  success: unknown[];
  failed: string[];
}
type HelpMapFn = (opts: { docsDir: string; outputDir: string; segregation: boolean }) => HelpMapResults;

async function loadFn(): Promise<HelpMapFn> {
  const mod = await import('./helpmap.js');
  const m = mod as unknown as { runGeneration: HelpMapFn; default?: { runGeneration: HelpMapFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const helpMapModule: ModuleDef = {
  name: 'helpMap',
  description: 'Генерирует app-help-contents.json для фронтенда',
  phase: 'pre',
  defaultOrder: 62,
  args: [
    { name: 'segregation', flag: '--segregation', type: 'boolean', description: 'Раскладывать по языкам' },
  ],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        runGeneration({
          docsDir: resolveDocsDir(opts),
          outputDir: resolveBuildDir(opts),
          segregation: Boolean(opts.segregation),
        });
        // helpMap никогда не фейлит CLI (back-compat): при пустом результате — warn, exit 0.
      },
    };
  },
};