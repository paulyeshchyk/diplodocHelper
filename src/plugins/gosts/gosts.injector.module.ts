import * as fs from 'node:fs';
import * as path from 'node:path';
import { findSectionIndexHtml, resolveBuildDir, resolveLangDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type InjectFn = (opts: { langDir: string; targetHtml: string; lang: string }) => {
  success: boolean;
  count?: number;
};

async function loadFn(): Promise<InjectFn> {
  const mod = await import('./gosts.injector.js');
  const m = mod as unknown as { injectGostsTable: InjectFn; default?: { injectGostsTable: InjectFn } };
  return m.injectGostsTable ?? m.default!.injectGostsTable;
}

export const gostsInjectModule: ModuleDef = {
  name: 'gostsInject',
  description: 'Инжектит таблицу ГОСТов в HTML-секцию',
  phase: 'post',
  defaultOrder: 30,
  args: [
    { name: 'section', flag: '--section', type: 'string', description: 'Имя секции (default: "ГОСТы")' },
    { name: 'targetHtml', flag: '--targetHtml', type: 'string', description: 'Явный путь к HTML' },
    { name: 'outputDir', flag: '--outputDir', type: 'string', description: '(legacy) build-директория' },
  ],
  async load() {
    const injectGostsTable = await loadFn();
    return {
      async run(opts) {
        const lang = String(opts.lang ?? 'ru');
        const section = String(opts.section ?? 'ГОСТы');
        const langDir = resolveLangDir(opts, lang);

        // backward compat: --outputDir от docs-build.js
        const buildDir =
          typeof opts.outputDir === 'string' && opts.outputDir.trim()
            ? path.resolve(opts.outputDir)
            : resolveBuildDir(opts);

        let targetHtml: string | null = null;
        if (typeof opts.targetHtml === 'string' && opts.targetHtml.trim()) {
          targetHtml = path.resolve(opts.targetHtml);
        } else {
          targetHtml = findSectionIndexHtml(buildDir, section);
        }

        if (!targetHtml || !fs.existsSync(targetHtml)) {
          throw new Error(`gostsInject: HTML файл не найден (секция: "${section}") под ${buildDir}`);
        }

        const r = injectGostsTable({ langDir, targetHtml, lang });
        if (!r.success) {
          throw new Error(`gostsInject: injectGostsTable returned success=false`);
        }
      },
    };
  },
};