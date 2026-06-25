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

    // Картируем массив с сохранением исходного порядкового номера (originalIndex)
    // Это гарантирует, что элементы без индексов не перемешаются между собой!
    const itemsWithPositions = tocData.items.map(
        (/** @type {{ [x: string]: string; }} */ item, /** @type {any} */ idx) => {
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
                    console.error(e);
                }
            }

            return {
                item,
                index: sectionIndex ? (isNaN(sectionIndex) ? null : sectionIndex) : null,
                originalIndex: idx, // сохраняем позицию, которая была в файле ДО сортировки
            };
        }
    );

    // Разделяем на индексированные и неиндексированные
    const indexed = itemsWithPositions.filter((/** @type {{ index: null; }} */ i) => i.index !== null);
    const nonIndexed = itemsWithPositions.filter((/** @type {{ index: null; }} */ i) => i.index === null);

    // Сортируем индексированные по их index
    // Если индексы равны, сохраняем их исходный порядок (originalIndex)
    indexed.sort(
        (
            /** @type {{ index: number; originalIndex: number; }} */ a,
            /** @type {{ index: number; originalIndex: number; }} */ b
        ) => {
            if (a.index === b.index) {
                return a.originalIndex - b.originalIndex;
            }
            return sortOrder === 'ascending' ? a.index - b.index : b.index - a.index;
        }
    );

    // Неиндексированные элементы мы ВООБЩЕ НЕ СОРТИРУЕМ,
    // только сохраняем их исходный порядок относительно друг друга
    nonIndexed.sort(
        (/** @type {{ originalIndex: number; }} */ a, /** @type {{ originalIndex: number; }} */ b) =>
            a.originalIndex - b.originalIndex
    );

    // Собираем итоговый массив обратно
    let finalOrderedEntries = buildOrderedArray(sortKind, nonIndexed, indexed);

    // Извлекаем чистые объекты обратно в tocData
    tocData.items = finalOrderedEntries.map(entry => entry.item);

    // Записываем в файл
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * @param {string} sortKind
 * @param {any} nonIndexed
 * @param {any} indexed
 */
function buildOrderedArray(sortKind, nonIndexed, indexed) {
    if (sortKind === 'nonIndexedTop') {
        return [...nonIndexed, ...indexed];
    } else {
        // индексированные (1, 2, 3) идут наверх, остальные вниз
        return [...indexed, ...nonIndexed];
    }
}

module.exports = { sortTocItems };
