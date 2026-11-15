import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';
import { generateContextsPage } from './report.ts';

export const periodicTableContextModule: ModuleDef = {
    name: 'periodicTableContext',
    description: 'Генерирует contextmap.html (матрица контекстов)',
    phase: 'post',
    defaultOrder: 65,
    args: [],
    async load() {
        return {
            async run(opts) {
                const outputDir = resolveBuildDir(opts);
                const langs = Array.isArray(opts.langs) && opts.langs.length > 0
                    ? (opts.langs as string[])
                    : ['ru', 'en'];
                generateContextsPage({
                    mapDir: outputDir,
                    outputDir,
                    lang: langs,
                });
            },
        };
    },
};