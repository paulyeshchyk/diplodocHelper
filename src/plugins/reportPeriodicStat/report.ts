import * as fs from 'node:fs';
import * as path from 'node:path';
import { readArticles, type RunGit } from './sources.ts';
import { collectReportModel } from './model.ts';
import { renderPresetsYaml } from './render.ts';

const PRESETS_YAML_FILENAME = 'presets.yaml';

export interface GenerateStatOptions {
    outputDir: string;
    docsDir: string;
    /** Языки для per-language presets. Если не задано — автоопределение из articles. */
    langs?: string[];
    yfmPath?: string;
    packageJsonPath?: string;
    runGit?: RunGit;
}

/**
 * Агрегатор: collect → render → write.
 * Никакой бизнес-логики — только композиция.
 */
export function generateStat(opts: GenerateStatOptions): void {
    try {
        const articles = readArticles(opts.outputDir);
        if (!articles) return;

        // Собираем список языков
        let langs: string[] = [];
        if (opts.langs && opts.langs.length > 0) {
            langs = opts.langs;
        } else {
            const set = new Set<string>();
            for (const a of articles) {
                if (typeof a.lang === 'string' && a.lang.trim()) set.add(a.lang.trim());
            }
            langs = Array.from(set);
        }

        // 1. Per-language: docs/<lang>/presets.yaml
        for (const lang of langs) {
            const langArticles = articles.filter((a) => a.lang === lang);
            const langDocsDir = path.join(opts.docsDir, lang);
            if (!fs.existsSync(langDocsDir)) continue;
            const model = collectReportModel(opts, langArticles);
            if (!model) continue;
            const outPath = path.join(langDocsDir, PRESETS_YAML_FILENAME);
            fs.writeFileSync(outPath, renderPresetsYaml(model), 'utf8');
            // console.log(`✓ presets.yaml (${lang}) → ${outPath}`);
        }

        // 2. Root (aggregate): docs/presets.yaml
        const model = collectReportModel(opts, articles);
        if (model) {
            const outPath = path.join(opts.docsDir, PRESETS_YAML_FILENAME);
            fs.writeFileSync(outPath, renderPresetsYaml(model), 'utf8');
            // console.log(`✓ presets.yaml (root aggregate) → ${outPath}`);
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('❌ Ошибка обработки статистики:', msg);
    }
}