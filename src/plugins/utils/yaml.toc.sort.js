// toc.yaml.sort.js

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const { FrontMatterFiles, FrontMatterToc } = require('../model/frontmatter.model');
const { IndexMdEntryReadIndex } = require('./md.index.entry');

/**
 * Сортирует элементы toc.yaml, сохраняя форматирование
 * @param {string} baseDir
 */
function sortTocItems(baseDir, sortOrder = 'ascending', sortKind = 'nonIndexedBottom') {
    const tocPath = path.join(baseDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    const fileContent = fs.readFileSync(tocPath, 'utf8');
    const tocData = YAML.parse(fileContent) || {};

    if (!tocData.items || !Array.isArray(tocData.items)) return;

    // Карпируем массив с сохранением исходного порядкового номера (originalIndex)
    // Это гарантирует, что элементы без индексов не перемешаются между собой!
    const itemsWithPositions = tocData.items.map((item, idx) => {
        const href = item[FrontMatterToc.ITEMS_HREF] || '';
        const folderName = href.split('/')[0];

        let sectionIndex = null;
        if (folderName) {
            const childFolderPath = path.join(baseDir, folderName);
            try {
                // Читаем индекс из index.md
                const readIdx = IndexMdEntryReadIndex(childFolderPath);
                if (readIdx !== undefined && readIdx !== null && readIdx !== '') {
                    sectionIndex = parseInt(readIdx, 10);
                }
            } catch (e) {
                // Если файла нет или ошибка — оставляем null
            }
        }

        return {
            item,
            index: isNaN(sectionIndex) ? null : sectionIndex,
            originalIndex: idx, // сохраняем позицию, которая была в файле ДО сортировки
        };
    });

    // Разделяем на индексированные и неиндексированные
    const indexed = itemsWithPositions.filter(i => i.index !== null);
    const nonIndexed = itemsWithPositions.filter(i => i.index === null);

    // Сортируем индексированные по их index
    // Если индексы равны, сохраняем их исходный порядок (originalIndex)
    indexed.sort((a, b) => {
        if (a.index === b.index) {
            return a.originalIndex - b.originalIndex;
        }
        return sortOrder === 'ascending' ? a.index - b.index : b.index - a.index;
    });

    // Неиндексированные элементы мы ВООБЩЕ НЕ СОРТИРУЕМ,
    // только сохраняем их исходный порядок относительно друг друга
    nonIndexed.sort((a, b) => a.originalIndex - b.originalIndex);

    // Собираем итоговый массив обратно
    let finalOrderedEntries = [];
    if (sortKind === 'nonIndexedTop') {
        finalOrderedEntries = [...nonIndexed, ...indexed];
    } else {
        // Твой случай: индексированные (1, 2, 3) идут наверх, остальные вниз
        finalOrderedEntries = [...indexed, ...nonIndexed];
    }

    // Извлекаем чистые объекты обратно в tocData
    tocData.items = finalOrderedEntries.map(entry => entry.item);

    // Записываем в файл
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * Сравнивает два индекса (например "1.2.3" и "1.10")
 * @param {string} a
 * @param {string} b
 */
function compareIndexes(a, b, order = 'ascending') {
    if (!a || !b) return 0;
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const maxLen = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLen; i++) {
        const ai = (i < aParts.length ? aParts[i] : 0) || 0;
        const bi = (i < bParts.length ? bParts[i] : 0) || 0;
        if (ai !== bi) {
            return order === 'ascending' ? ai - bi : bi - ai;
        }
    }
    return 0;
}

module.exports = { sortTocItems };
