// src/core/indexer.js

const fs = require('fs');
const path = require('path');
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require('../utils/constants');
const { get } = require('../utils/frontmatter');

/**
 * @param {string} targetDir
 */
function calculateNextIndex(targetDir) {
    const parentIndexPath = path.join(targetDir, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(parentIndexPath)) return '1'; // Фоллбек, если родителя нет

    const parentContent = fs.readFileSync(parentIndexPath, 'utf8');
    const parentIndex = String(get(parentContent, 'sectionIndex') || '');

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    const siblingIndices = [];

    for (const item of items) {
        if (!item.isDirectory()) continue;

        const indexPath = path.join(targetDir, item.name, FrontMatterFiles.INDEX_MD);
        if (!fs.existsSync(indexPath)) continue;

        try {
            const content = fs.readFileSync(indexPath, 'utf8');
            const sectionType = get(content, 'sectionType');
            // Принудительно приводим к строке, чтобы split не падал
            const sectionIndex = String(get(content, 'sectionIndex') || '');

            if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
                const parts = sectionIndex.split('.');
                const lastPart = parts[parts.length - 1];
                const lastNum = parseInt(lastPart, 10);

                if (!isNaN(lastNum)) {
                    siblingIndices.push(lastNum);
                }
            }
        } catch (e) {
            console.error(`Ошибка при чтении ${indexPath}:`, e);
            continue; // Пропускаем проблемный файл вместо падения
        }
    }

    // Безопасный поиск максимума без оператора '...'
    const maxIdx = siblingIndices.reduce((a, b) => Math.max(a, b), 0);
    const nextSubNumber = maxIdx + 1;

    return parentIndex === '' ? `${nextSubNumber}` : `${parentIndex}.${nextSubNumber}`;
}

module.exports = { calculateNextIndex };
