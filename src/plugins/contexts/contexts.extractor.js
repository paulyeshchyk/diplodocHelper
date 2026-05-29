// src/plugins/contexts/contexts.extractor.js

const fs = require('fs');
const path = require('path');
const { parse } = require('../../plugins/utils/frontmatter');

/**
 * Извлекает значение context из frontmatter с помощью gray-matter
 * @param {string} fullPath
 * @param {string} langDir
 * @param {any} contextMap
 */
function extractContextTagValue(fullPath, langDir, contextMap) {
    const content = fs.readFileSync(fullPath, 'utf8');

    const { data } = parse(content);

    const contextValue = data.context;

    if (!contextValue || typeof contextValue !== 'string') {
        return;
    }

    // Надёжно разбиваем на отдельные термины
    const terms = contextValue
        .split(/[\s,]+/) // пробелы + запятые как разделители
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => t.toLowerCase());

    if (terms.length === 0) return;

    const displayTitle = getTitleFromMDMetadata(fullPath, langDir);
    const relativeToLang = path.relative(langDir, fullPath).replace(/\\/g, '/');

    for (const term of terms) {
        if (!contextMap[term]) {
            contextMap[term] = { rank: 0, pages: [] };
        }
        contextMap[term].rank += 1;
        contextMap[term].pages.push({
            title: displayTitle,
            href: relativeToLang,
        });
    }
}

const { getTitleFromMetadata } = require('../core/utils');

/**
 * Формирует отображаемый заголовок статьи
 * @param {string} fullPath
 * @param {string} langDir
 */
function getTitleFromMDMetadata(fullPath, langDir) {
    const articleTitle = getTitleFromMetadata(fullPath) || path.basename(fullPath);
    const parentDir = path.dirname(fullPath);
    const parentIndexPath = path.join(parentDir, '..', 'index.md');

    if (parentDir !== langDir) {
        const parentTitle = getTitleFromMetadata(parentIndexPath);
        if (parentTitle) return `${articleTitle} - ${parentTitle}`;
    }
    return articleTitle;
}

module.exports = { extractContextTagValue, getTitleFromMDMetadata };
