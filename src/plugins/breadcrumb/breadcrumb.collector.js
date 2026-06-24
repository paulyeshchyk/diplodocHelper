const fs = require('fs');
const path = require('path');
const { extractTitleFromHtml } = require('./breadcrumb.extractor');
const { DEFAULT_CONFIG } = require('./breadcrumb.config');
const { getRelativePath } = require('../utils/path.extract');
const { isHtmlFile, isRootIndex } = require('../utils/html.utils');

/**
 * Собирает карту заголовков всех страниц
 * @param {string} buildDir
 * @returns {Map<string, string>}
 */
function walkHtmlFilesBuildTitleMap(buildDir) {
    /** @type {Map<string, string>} */
    const titleMap = new Map();

    walkHtmlFiles(buildDir, htmlPath => {
        const fileName = path.basename(htmlPath);
        if (DEFAULT_CONFIG.ignoreFiles.includes(fileName)) return;
        if (isRootIndex(buildDir, htmlPath)) return;

        const content = fs.readFileSync(htmlPath, 'utf8');
        const title = extractTitleFromHtml(content);

        if (title) {
            const rel = getRelativePath(buildDir, htmlPath);
            titleMap.set(rel, title);
        }
    });

    return titleMap;
}

/**
 * Рекурсивно обходит все HTML-файлы
 * @param {string} dir
 * @param {(htmlPath: string) => void} callback
 */
function walkHtmlFiles(dir, callback) {
    const filter = (/** @type {string}*/ fullPath) => isHtmlFile(fullPath);
    walk(dir, filter, callback);
}

/**
 * Рекурсивный обход директории с фильтром
 * @param {string} dir
 * @param {(fullPath: string, entry: fs.Dirent) => boolean} filter
 * @param {(fullPath: string) => void} callback
 */
function walk(dir, filter, callback) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath, filter, callback);
        } else if (filter(fullPath, entry)) {
            callback(fullPath);
        }
    }
}
module.exports = { walkHtmlFiles, walkHtmlFilesBuildTitleMap };
