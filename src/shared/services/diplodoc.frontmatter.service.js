const fs = require('fs');
const path = require('path');

/**
 * Извлекает заголовок из frontmatter или первого H1
 * @param {string} filePath
 * @returns {string | null}
 */
function diplodocFrontmatterGetTitleFromMetadata(filePath) {
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');

    const metaMatch = content.match(/^---[\s\S]*?title:\s*(.*?)[\s\S]*?---/m);
    if (metaMatch?.[1]) return metaMatch[1].trim();

    const h1Match = content.match(/^#\s+(.*)/m);
    return h1Match ? h1Match[1].trim() : null;
}

/**
 * Формирует отображаемый заголовок статьи
 * @param {string} fullPath
 * @param {string} langDir
 */
function diplodocFrontmatterGetTitleFromFile(fullPath, langDir) {
    const articleTitle = diplodocFrontmatterGetTitleFromMetadata(fullPath) || path.basename(fullPath);
    const parentDir = path.dirname(fullPath);
    const parentIndexPath = path.join(parentDir, '..', 'index.md');

    if (parentDir !== langDir) {
        const parentTitle = diplodocFrontmatterGetTitleFromMetadata(parentIndexPath);
        if (parentTitle) return `${articleTitle} - ${parentTitle}`;
    }
    return articleTitle;
}
module.exports = {
    diplodocFrontmatterGetTitleFromMetadata,
    diplodocFrontmatterGetTitleFromFile,
};
