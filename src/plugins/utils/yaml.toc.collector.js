// toc.collector.js
const fs = require('fs');
const path = require('path');
const { getTocYamlItems } = require('./yaml.toc.flow');

/**
 * Рекурсивно собирает все пути к index.md, следуя порядку в toc.yaml
 * @param {string} rootDir - корневая директория документации (где лежит главный toc.yaml)
 * @param {string} currentTocPath - путь к текущему toc.yaml (относительно rootDir или абсолютный)
 * @param {Set<string>} [visited] - для защиты от циклических include
 * @returns {string[]} массив абсолютных путей к index.md
 */
function collectIndexMdFiles(rootDir, currentTocPath, visited = new Set()) {
    // Нормализуем путь к текущему toc.yaml
    const absoluteTocPath = path.resolve(rootDir, currentTocPath);
    if (visited.has(absoluteTocPath)) {
        console.warn(`Обнаружен циклический include: ${absoluteTocPath}`);
        return [];
    }
    visited.add(absoluteTocPath);

    if (!fs.existsSync(absoluteTocPath)) {
        console.warn(`Файл не найден: ${absoluteTocPath}`);
        return [];
    }

    const items = getTocYamlItems(absoluteTocPath);

    const result = [];

    for (const item of items) {
        // 1. Если есть href — добавляем index.md из соответствующей папки
        if (item.href) {
            // Предполагаем, что href ведёт на папку (например, "chapter1/")
            // Если href указывает на .md файл, берём его директорию
            let folderPart = item.href;
            if (folderPart.endsWith('.md')) {
                folderPart = path.dirname(folderPart);
            }
            // Путь к index.md относительно корня
            const tocDir = path.dirname(absoluteTocPath);
            const relativeToRoot = path.relative(rootDir, tocDir);
            const indexMdPath = path.join(rootDir, relativeToRoot, folderPart, 'index.md');
            const absoluteIndexPath = path.resolve(indexMdPath);
            if (fs.existsSync(absoluteIndexPath)) {
                result.push(absoluteIndexPath);
            } else {
                console.warn(`index.md не найден: ${absoluteIndexPath}`);
            }
        }

        // 2. Если есть include — обрабатываем вложенный toc.yaml
        if (item.include && item.include.path) {
            // Путь к включаемому toc.yaml указывается относительно расположения текущего toc.yaml
            const currentDir = path.dirname(absoluteTocPath);
            const includePath = path.join(currentDir, item.include.path);
            // Вычисляем относительный путь от rootDir для рекурсивного вызова
            const relativeIncludePath = path.relative(rootDir, includePath);
            const includedFiles = collectIndexMdFiles(rootDir, relativeIncludePath, visited);
            result.push(...includedFiles);
        }
    }

    return result;
}

/**
 * Возвращает все index.md файлы в порядке из корневого toc.yaml
 * @param {string} rootDir - директория, содержащая корневой toc.yaml
 * @returns {string[]}
 */
function getAllIndexMdFiles(rootDir) {
    const rootTocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(rootTocPath)) {
        console.error(`Корневой toc.yaml не найден: ${rootTocPath}`);
        return [];
    }
    return collectIndexMdFiles(rootDir, rootTocPath);
}

module.exports = {
    collectIndexMdFiles,
    getAllIndexMdFiles,
};
