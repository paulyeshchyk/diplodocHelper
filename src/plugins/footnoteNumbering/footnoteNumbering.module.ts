import { resolveBuildDir, resolveLangDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type RenumberFn = (opts: { docsDir: string; outputDir: string }) => {
  success: boolean;
  total: number;
  changed: number;
};

async function loadFn(): Promise<RenumberFn> {
  const mod = await import('./renumber-footnotes.js');
  const m = mod as unknown as { renumberFootnotes: RenumberFn; default?: { renumberFootnotes: RenumberFn } };
  return m.renumberFootnotes ?? m.default!.renumberFootnotes;
}

export const footnoteNumberingModule: ModuleDef = {
  name: 'footnoteNumbering',
  description: 'Сквозная нумерация сносок в HTML',
  phase: 'post',
  defaultOrder: 25,
  args: [],
  async load() {
    const renumberFootnotes = await loadFn();
    return {
      async run(opts) {
        const lang = String(opts.lang ?? 'ru');
        const docsDir = resolveLangDir(opts, lang);
        const outputDir = resolveBuildDir(opts);
        const r = renumberFootnotes({ docsDir, outputDir });
        if (!r.success) {
          throw new Error('footnoteNumbering: renumberFootnotes returned success=false');
        }
      },
    };
  },
};