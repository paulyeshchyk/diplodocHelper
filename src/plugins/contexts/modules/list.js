// modules/list.js
const { slugify_filename } = require('../../utils/encoding.slugify');

/**
 * Генерирует контент для вкладки "Алфавитный указатель"
 * @param {Object} params
 * @param {string} params.lang - 'ru' или 'en'
 * @param {string[]} params.sortedTerms - отсортированные термины
 * @param {import('../../model/contextmap.model').ContextMap} params.contextMap
 * @returns {string} Markdown-разметка списка
 */
function generateListContent({ lang, sortedTerms, contextMap }) {
    let content = '<br/>\n';
    let currentLetter = '';
    const suffix = lang === 'ru' ? 'ст.' : 'docs';
    const alphaSorted = [...sortedTerms].sort((a, b) => a.localeCompare(b));

    for (const term of alphaSorted) {
        const firstLetter = term.charAt(0).toUpperCase();
        const slug = slugify_filename(term);
        const count = contextMap[term]?.rank || 0;

        if (firstLetter !== currentLetter) {
            if (currentLetter !== '') content += '\n';
            content += `\n### ${firstLetter}\n`;
            currentLetter = firstLetter;
        }
        content += `* [${term}](${slug}.md) (${count} ${suffix})\n`;
    }
    return content;
}

module.exports = { generateListContent };
