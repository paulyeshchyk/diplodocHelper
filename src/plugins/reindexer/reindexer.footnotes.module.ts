import { resolveLangDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type ReindexFootnotesFn = (rootDir: string) => {
  success: boolean;
  total: number;
  changed: number;
  reason?: string;
};

async function loadFn(): Promise<ReindexFootnotesFn> {
  const mod = await import('./reindexer.footnotes.js');
  const m = mod as unknown as { reindexFootnotes: ReindexFootnotesFn; default?: { reindexFootnotes: ReindexFootnotesFn } };
  return m.reindexFootnotes ?? m.default!.reindexFootnotes;
}

export const reindexFootnotesModule: ModuleDef = {
  name: 'reindexFootnotes',
  description: 'Переиндексирует сноски в документации',
  phase: 'pre',
  defaultOrder: 61,
  args: [],
  async load() {
    const reindexFootnotes = await loadFn();
    return {
      async run(opts) {
        const lang = String(opts.lang ?? 'ru');
        const rootDir = resolveLangDir(opts, lang);
        const result = reindexFootnotes(rootDir);
        if (!result.success) {
          throw new Error(`reindexFootnotes: ${result.reason ?? 'unknown'}`);
        }
      },
    };
  },
};