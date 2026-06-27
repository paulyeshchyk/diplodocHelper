// src/plugins/utils/yaml.toc.walker.js

const fs = require('fs');
const path = require('path');

const { TocYamlFileLoad } = require('../utils/yaml.toc.flow');

/** @type {TocYamlWalkerOptions} */
const DEFAULT_OPTIONS = {
    indexFiles: ['index.md'],
    contentExtensions: ['.md'],
    skipFilenames: ['toc.yaml', 'index.yaml'],
};

/**
 * Рекурсивный сбор файлов по структуре TOC
 *
 * @param {TocYamlItem[] | TocYamlItem | null | undefined} entries
 * @param {string} rootDir - корневая директория проекта
 * @param {string} [currentPath='']
 * @param {Set<string>} [visited]
 * @param {Partial<TocYamlWalkerOptions>} [options]
 * @returns {string[]}
 */
function collectFilesInOrder(entries, rootDir, currentPath = '', visited = new Set(), options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!entries) return [];

    const items = Array.isArray(entries) ? entries : [entries];
    /** @type {string[]} */
    let files = [];

    for (const /** @type {TocYamlItem} */ entry of items) {
        // 1. Основной файл (href)
        if (entry.href) {
            const href = entry.href.trim();

            // Пропускаем файлы из чёрного списка
            if (opts.skipFilenames.some(skip => href.endsWith(skip))) {
                continue;
            }

            const basePath = path.join(rootDir, currentPath, href);

            let found = null;

            // Если путь уже заканчивается на одно из разрешённых расширений — берём как есть
            if (opts.contentExtensions.some(ext => href.toLowerCase().endsWith(ext))) {
                if (fs.existsSync(basePath)) {
                    found = basePath;
                }
            }
            // Иначе ищем индексный файл
            else {
                found = findFirstExistingIndex(basePath, opts.indexFiles);
            }

            if (found) {
                files.push(found);
            } else {
                console.warn(`Файл не найден: ${basePath} (пробовали индексы: ${opts.indexFiles.join(', ')})`);
            }
        }

        // 2. include — подключаемый toc.yaml
        if (entry.include?.path) {
            const includeRelPath = entry.include.path;
            const absIncludePath = path.join(rootDir, currentPath, includeRelPath);
            const canonical = path.resolve(absIncludePath);

            if (!visited.has(canonical)) {
                visited.add(canonical);

                try {
                    const toc = TocYamlFileLoad(absIncludePath);
                    const subItems = toc?.items ?? [];
                    const includeDir = path.join(currentPath, path.dirname(includeRelPath));

                    const includeFiles = collectFilesInOrder(
                        subItems,
                        rootDir,
                        includeDir,
                        visited,
                        options // передаём те же опции дальше
                    );
                    files.push(...includeFiles);
                } catch (err) {
                    console.error(`Не удалось загрузить include ${absIncludePath}:`, err);
                }
            }
        }

        // 3. Вложенные подразделы
        if (Array.isArray(entry.items)) {
            const subFiles = collectFilesInOrder(entry.items, rootDir, currentPath, visited, options);
            files.push(...subFiles);
        }
    }

    return files;
}

/**
 * Ищет первый существующий индексный файл
 * @param {string} dirPath
 * @param {string[]} candidates
 * @returns {string | null}
 */
function findFirstExistingIndex(dirPath, candidates) {
    for (const filename of candidates) {
        const fullPath = path.join(dirPath, filename);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
}

module.exports = {
    collectFilesInOrder,
    DEFAULT_OPTIONS,
};
