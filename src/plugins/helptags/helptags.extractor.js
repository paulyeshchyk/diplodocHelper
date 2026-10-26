// @ts-nocheck
// plugins/helptags/helptags.extractor.js

const fs = require('fs');
const path = require('path');
const { parse } = require('../utils/frontmatter.utils'); // Оставляем только парсер

/**
 * Извлекает значение helptag из frontmatter с игнорированием регистра
 * @param {string} fullPath
 * @param {string} langDir
 * @param {Object} helptagMap
 */
function extractHelptagTagValue(fullPath, langDir, helptagMap) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const { data } = parse(content);
    const helptagValue = data.helptag;

    if (!helptagValue || typeof helptagValue !== 'string') {
        return;
    }

    // Регистронезависимый разбор тегов
    const tags = helptagValue
        .split(/[\s,]+/)
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

    if (tags.length === 0) return;

    // Относительный путь от корня языка (с заменой слэшей для Windows)
    // Например: "shop/orders/index.md" или "shop/orders/error.md"
    const relativePath = path.relative(langDir, fullPath).replace(/\\/g, '/');

    // Формируем красивое отображение для техписа
    let displayPath = relativePath;
    if (relativePath.endsWith('/index.md')) {
        // Отрезаем "/index.md", оставляя только "shop/orders"
        displayPath = relativePath.slice(0, -9);
    } else if (relativePath === 'index.md') {
        // На случай, если статья лежит прямо в корне языка
        displayPath = 'index.md';
    }

    for (const tag of tags) {
        if (!helptagMap[tag]) {
            helptagMap[tag] = { rank: 0, pages: [] };
        }

        const alreadyExists = helptagMap[tag].pages.some(p => p.href === relativePath);

        if (!alreadyExists) {
            helptagMap[tag].rank += 1;
            helptagMap[tag].pages.push({
                title: displayPath, // Красивое имя без index.md для текста ссылки
                href: relativePath, // Полный путь для хэндла ссылки
            });
        }
    }
}

module.exports = { extractHelptagTagValue };
