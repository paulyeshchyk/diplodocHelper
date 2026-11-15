import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';
import { generateBytesCounterPage } from './report.ts';

export const periodicTableModule: ModuleDef = {
    name: 'periodicTable',
    description: 'Генерирует bytescounter.html (матрица размеров статей)',
    phase: 'post',
    defaultOrder: 55,
    args: [],
    async load() {
        return {
            async run(opts) {
                const outputDir = resolveBuildDir(opts);
                const langs = Array.isArray(opts.langs) && opts.langs.length > 0
                    ? (opts.langs as string[])
                    : ['ru', 'en'];
                generateBytesCounterPage({
                    mapDir: outputDir,
                    outputDir,
                    lang: langs,
                });
            },
        };
    },
};