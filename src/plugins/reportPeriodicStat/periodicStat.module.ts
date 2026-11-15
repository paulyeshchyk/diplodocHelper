import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';
import { generateStat } from './report.ts';

export const periodicStatModule: ModuleDef = {
    name: 'periodicStat',
    description: 'Генерирует presets.yaml со статистикой',
    phase: 'pre',
    defaultOrder: 63,
    args: [],
    async load() {
        return {
            async run(opts) {
                const outputDir = resolveBuildDir(opts);
                const docsDir = resolveDocsDir(opts);
                generateStat({ outputDir, docsDir,langs: ['ru', 'en'] });
            },
        };
    },
};