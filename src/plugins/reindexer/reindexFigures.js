const fs = require('fs');
const path = require('path');

const { TocYamlFileLoad } = require('../utils/toc.yaml.file');

/** @typedef {Object} ReindexFiguresResult
 * @property {boolean} success
 * @property {number} total
 * @property {string | undefined} reason
 */

/**
 * Главная функция
 * @param {string} rootDir
 * @param {string} prefix
 * @returns {ReindexFiguresResult}
 */
function reindexFigures(rootDir, prefix) {
    console.log('Переиндексация рисунков...');

    const tocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        console.warn('toc.yaml не найден');
        return { success: false, reason: 'no_toc', total: 0 };
    }

    let tocDoc;
    try {
        tocDoc = TocYamlFileLoad(tocPath);
    } catch (err) {
        console.error('Ошибка парсинга toc.yaml:', err);
        return { success: false, reason: 'parse_error', total: 0 };
    }

    // Важно: корневой toc обычно содержит поле items
    const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items ? tocDoc?.items : [];

    const allMdFiles = collectMdFilesInOrder(entries, rootDir);

    if (allMdFiles.length === 0) {
        console.warn('Не найдено .md файлов через toc.yaml');
        return { success: true, total: 0, reason: 'no md-file found' };
    }

    let figureCounter = 1;

    for (const mdFilePath of allMdFiles) {
        try {
            const content = fs.readFileSync(mdFilePath, 'utf8');
            const result = processFigureCaptions(content, figureCounter, prefix);

            if (result.newContent !== content) {
                fs.writeFileSync(mdFilePath, result.newContent, 'utf8');
                console.log(`${path.relative(rootDir, mdFilePath)} — +${result.newCounter - figureCounter} рис.`);
            }
            figureCounter = result.newCounter;
        } catch (err) {
            console.error(`Ошибка обработки ${mdFilePath}:`, err);
        }
    }

    console.log(`Готово. Всего пронумеровано: ${figureCounter - 1}`);
    return { success: true, total: figureCounter - 1, reason: '' };
}

/**
 * Рекурсивный сбор md-файлов
 * @param {any[] | any} entries - массив элементов или один элемент
 * @param {string} rootDir
 * @returns {string[]}
 */
function collectMdFilesInOrder(entries, rootDir, currentPath = '', visited = new Set()) {
    if (!entries) return [];

    // Если передан не массив — оборачиваем
    const items = Array.isArray(entries) ? entries : [entries];
    let files = [];

    for (const entry of items) {
        // 1. include
        if (entry.include?.path) {
            const includeRelPath = entry.include.path;
            const absIncludePath = path.join(rootDir, currentPath, includeRelPath);
            const canonical = path.resolve(absIncludePath);

            if (visited.has(canonical)) continue;
            visited.add(canonical);

            try {
                const toc = TocYamlFileLoad(absIncludePath);
                const subItems = toc.items;

                const includeDir = path.join(currentPath, path.dirname(includeRelPath));
                files.push(...collectMdFilesInOrder(subItems, rootDir, includeDir, visited));
            } catch (err) {
                let msg = err instanceof Error ? err.message : String(err);
                console.error(`Не удалось загрузить include ${absIncludePath}:`, msg);
            }
        }

        // 2. href (только md-файлы)
        if (entry.href) {
            const href = entry.href.trim();
            if (href.endsWith('toc.yaml') || href.endsWith('index.yaml')) continue;

            let mdPath = path.join(rootDir, currentPath, href);
            if (!href.endsWith('.md')) {
                mdPath = path.join(mdPath, 'index.md');
            }

            if (fs.existsSync(mdPath)) {
                files.push(mdPath);
            } else {
                console.warn(`Файл не найден: ${mdPath}`);
            }
        }

        // 3. вложенные items
        if (Array.isArray(entry.items)) {
            files.push(...collectMdFilesInOrder(entry.items, rootDir, currentPath, visited));
        }
    }

    return files;
}

/**
 * Обработка подписей к рисункам
 * Обработка подписей к рисункам — сквозная нумерация
 * @param {string} content
 * @param {number} startCounter
 * @param {string} prefix
 */
function processFigureCaptions(content, startCounter, prefix) {
    let counter = startCounter;

    const regex =
        /<figure>\s*<figcaption\s+class="imageDescription"([^>]*?)\s+id="([^"]+)"([^>]*?)>([\s\S]*?)<\/figcaption>\s*<\/figure>/gi;

    const newContent = content.replace(
        regex,
        (
            /** @type {any} */ match,
            /** @type {any} */ beforeId,
            /** @type {any} */ id,
            /** @type {any} */ afterId,
            /** @type {string} */ captionText
        ) => {
            // Удаляем любой предыдущий номер (Рисунок 123., 456., Figure 5. и т.д.)
            let cleaned = captionText
                .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
                .replace(/^\d+\.\s*/, '')
                .trim();

            const newCaption = `${prefix} ${counter}. ${cleaned}`;
            const replacement = `<figure><figcaption class="imageDescription" id="${id}"${afterId}>${newCaption}</figcaption></figure>`;
            counter++;
            return replacement;
        }
    );

    return { newContent, newCounter: counter };
}

module.exports = { reindexFigures };
