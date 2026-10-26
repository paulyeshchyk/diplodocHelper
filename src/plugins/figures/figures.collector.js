// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { extractFiguresFromFile } = require('./figures.extractor');

// Чтобы не зациклиться и не тащить служебные страницы
const SKIP_DIRS = new Set(['figures', 'contexts', 'helptags']);

/**
 * @param {string} langDir
 * @returns {import('./figures.model').FigureInfo[]}
 */
function walkMdFilesGetFigures(langDir) {
    const figures = [];

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
            } else if (entry.name.endsWith('.md')) {
                try {
                    figures.push(...extractFiguresFromFile(fullPath, langDir));
                } catch (e) {
                    console.error(`❌ [Figures] Ошибка обработки ${fullPath}:`, e.message);
                }
            }
        }
    }

    walk(langDir);
    return figures;
}

module.exports = { walkMdFilesGetFigures };
