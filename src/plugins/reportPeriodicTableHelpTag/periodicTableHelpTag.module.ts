import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';
import { generateHelpTagPage } from './report.ts';

export const periodicTableHelpTagModule: ModuleDef = {
    name: 'periodicTableHelpTag',
    description: 'Генерирует helptagmap.html (матрица хелптэгов)',
    phase: 'post',
    defaultOrder: 60,
    args: [],
    async load() {
        return {
            async run(opts) {
                const outputDir = resolveBuildDir(opts);
                const langs = Array.isArray(opts.langs) && opts.langs.length > 0
                    ? (opts.langs as string[])
                    : ['ru', 'en'];
                generateHelpTagPage({
                    mapDir: outputDir,
                    outputDir,
                    lang: langs,
                });
            },
        };
    },
};