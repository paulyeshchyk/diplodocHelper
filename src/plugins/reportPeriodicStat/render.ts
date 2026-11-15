import type { ReportModel } from './model.ts';

function block(model: ReportModel): string {
    const { about, stats } = model;
    return `
    about:
        author: "${about.author}"
        start_date: "${about.start_date}"
        version: "${about.version}"
    stats:
        total_articles: "${stats.totalArticles}"
        avg_size: "${stats.avgSize.toLocaleString('ru-RU')}"
        reading_time: "${stats.readingTime}"
        total_sections: "${stats.totalSections}"
        total_chapters: "${stats.totalChapters}"
        total_contexts: "${stats.totalContexts}"
        total_tags: "${stats.totalHelptags}"
        last_update: "${stats.last_update}"
        commit_hash: "${stats.commit_hash}"
`.trimEnd();
}

export function renderPresetsYaml(model: ReportModel): string {
    return `# Автоматически сгенерированные переменные. Не редактировать вручную.
default:
${block(model)}

internal:
${block(model)}
`;
}