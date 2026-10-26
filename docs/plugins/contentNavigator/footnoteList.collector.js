const fs = require('fs');
const path = require('path');
const { collectMdFilesByToc } = require('../utils/toc.order');
const { extractFootnoteRefs, extractFootnoteDefs } = require('../reindexer/reindexer.footnotes');
const matter = require('gray-matter');

/**
 * Собирает сквозной перечень сносок.
 * Порядок — toc.yaml, нумерация — уникальные id в порядке первого упоминания.
 * @param {string} docsDir — путь к языковой папке, например ./docs/ru
 * @param {string} langPrefix — префикс в build (обычно 'ru'), подставляется в url
 * @returns {Array<{number: number;text: string;article: string;url: string;}>}
 * @param {any} urlPrefix
 */
function collectFootnotes(docsDir, langPrefix, urlPrefix) {
    const files = collectMdFilesByToc(docsDir);
    const result = [];
    let counter = 1;

    for (const file of files) {
        let content;
        try {
            content = fs.readFileSync(file, 'utf8');
        } catch (err) {
            let txt = err instanceof Error ? err.message : String(err);
            console.error(`❌ [footnoteList] Не удалось прочитать ${file}: ${txt}`);
            continue;
        }

        const { data } = matter(content);
        const title =
            (data.title && String(data.title).trim()) ||
            (data.pureTitle && String(data.pureTitle).trim()) ||
            path.basename(path.dirname(file));

        const refs = extractFootnoteRefs(content);
        const defs = extractFootnoteDefs(content);

        // Уникальные id в порядке первого появления.
        const idToNumber = new Map();
        for (const r of refs) {
            if (!idToNumber.has(r.id)) {
                idToNumber.set(r.id, counter++);
            }
        }

        // Текст берём из первого определения.
        const defsById = new Map();
        for (const d of defs) {
            if (!defsById.has(d.id)) defsById.set(d.id, d.content);
        }

        const rel = path.relative(docsDir, file).replace(/\\/g, '/').replace(/\.md$/, '.html');
        const prefixWithLang = langPrefix ? `${langPrefix}/` : '';
        const url = `${urlPrefix}${prefixWithLang}${rel}`;

        for (const [id, num] of idToNumber) {
            result.push({
                number: num,
                text: stripLinks(defsById.get(id) || ''),
                article: title,
                url, // ссылка на статью
                refUrl: `${url}#fnref${num}`, // ссылка на указатель сноски
            });
        }
    }

    return result;
}

/**
 * @param {any} str
 */
function stripLinks(str) {
    return (
        String(str || '')
            // markdown-картинки: ![alt](url) -> alt
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            // markdown-ссылки: [text](url) -> text
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            // HTML-якоря: <a ...>...</a> -> содержимое
            .replace(/<\/?a\b[^>]*>/gi, '')
    );
}

module.exports = { collectFootnotes };
