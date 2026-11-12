import * as path from 'node:path';
import { findSectionIndexHtml, resolveBuildDir, resolveLangDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type InjectFn = (opts: {
  docsDir: string;
  targetHtml: string;
  langPrefix?: string | null;
}) => { success: boolean; count?: number };

async function loadFn(): Promise<InjectFn> {
  const mod = await import('./Pagebuilder.Config.FootnoteList.js');
  const m = mod as unknown as { injectFootnoteList: InjectFn; default?: { injectFootnoteList: InjectFn } };
  return m.injectFootnoteList ?? m.default!.injectFootnoteList;
}

export const footnoteListModule: ModuleDef = {
  name: 'footnoteList',
  description: 'Инжектит перечень сносок в HTML-секцию',
  phase: 'post',
  defaultOrder: 26,
  args: [
    { name: 'section', flag: '--section', type: 'string', description: 'Имя секции (поиск по HTML)' },
    { name: 'targetHtml', flag: '--targetHtml', type: 'string', description: 'Явный путь к HTML' },
  ],
  async load() {
    const injectFootnoteList = await loadFn();
    return {
      async run(opts) {
        const lang = String(opts.lang ?? 'ru');
        const docsDir = resolveLangDir(opts, lang);
        const buildDir = resolveBuildDir(opts);

        let targetHtml: string | null = null;
        if (typeof opts.section === 'string' && opts.section.trim()) {
          targetHtml = findSectionIndexHtml(buildDir, opts.section);
          if (!targetHtml) {
            throw new Error(`footnoteList: секция "${opts.section}" не найдена под ${buildDir}`);
          }
        } else if (typeof opts.targetHtml === 'string' && opts.targetHtml.trim()) {
          targetHtml = path.resolve(opts.targetHtml);
        } else {
          throw new Error('footnoteList: нужен --section или --targetHtml');
        }

        const basename = path.basename(docsDir);
        const langPrefix = /^[a-z]{2}$/i.test(basename) ? basename : null;

        const r = injectFootnoteList({ docsDir, targetHtml, langPrefix });
        if (!r.success) {
          throw new Error('footnoteList: injectFootnoteList returned success=false');
        }
      },
    };
  },
};