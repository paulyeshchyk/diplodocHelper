const fs = require('fs');
const path = require('path');

const { TocYamlFileLoad } = require('../utils/yaml.toc.file');
const { DiplodocConfigFromJson } = require('../utils/diplodoc.config');

/**
 * @import { DiplodocConfig } from '../model/diplodocconfig.model'
 */

/** @param {string} rootDir
 * @param {string | undefined} targetLocale
 * @param {string | object | undefined} configJsonOrObj
 */
function reindexFigures(rootDir, targetLocale, configJsonOrObj) {
    console.log('Переиндексация рисунков...');
    const finalPrefix = readFinalPrefix(configJsonOrObj, targetLocale);
    const tocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        console.warn('toc.yaml не найден');
        return { success: false, reason: 'no_toc', total: 0 };
    }

    let tocDoc;
    try {
        tocDoc = TocYamlFileLoad(tocPath);
    } catch {
        return { success: false, reason: 'parse_error', total: 0 };
    }

    const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items || [];
    const allMdFiles = collectMdFilesInOrder(entries, rootDir);

    if (allMdFiles.length === 0) {
        return { success: true, total: 0, reason: 'no md-file found' };
    }

    // ---- ПЕРВЫЙ ПРОХОД: обновляем подписи и собираем маппинг ----
    let globalFigureMapping = new Map();
    let figureCounter = 1;

    for (const mdFilePath of allMdFiles) {
        try {
            const content = fs.readFileSync(mdFilePath, 'utf8');
            const { newContent, newCounter, figureMapping } = processFigureCaptions(
                content,
                figureCounter,
                finalPrefix
            );

            // Сливаем маппинг
            for (const [id, num] of figureMapping) {
                globalFigureMapping.set(id, num);
            }

            if (newContent !== content) {
                fs.writeFileSync(mdFilePath, newContent, 'utf8');
                console.log(`${path.relative(rootDir, mdFilePath)} — +${newCounter - figureCounter} рис.`);
            }
            figureCounter = newCounter;
        } catch (err) {
            console.error(`Ошибка обработки ${mdFilePath}:`, err);
        }
    }

    // ---- ВТОРОЙ ПРОХОД: обновляем ссылки ----
    updateAllLinks(allMdFiles, globalFigureMapping, finalPrefix);

    console.log(`Готово. Всего пронумеровано: ${figureCounter - 1}`);
    return { success: true, total: figureCounter - 1, reason: '' };
}

/**
 * @param {string | object | undefined} configJsonOrObj
 * @param {string | undefined} targetLocale
 */
function readFinalPrefix(configJsonOrObj, targetLocale) {
    let config = DiplodocConfigFromJson(configJsonOrObj);
    const activeLocale = targetLocale || config.defaultLanguage || 'ru';
    return GetPrefixOrDefault(config, activeLocale, targetLocale);
}

/**
 * @param {DiplodocConfig} config
 * @param {string} activeLocale
 * @param {string | undefined} targetLocale
 */
function GetPrefixOrDefault(config, activeLocale, targetLocale) {
    return activeLocale !== targetLocale ? 'Figure' : config.figureCaptionPrefix || 'Figure';
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
 * @param {string} content
 * @param {number} startCounter
 * @param {string} prefix
 * @returns {{ newContent: string, newCounter: number, figureMapping: Map<string, number> }}
 */
function processFigureCaptions(content, startCounter, prefix) {
    let counter = startCounter;
    const mapping = new Map(); // id -> новый номер

    const regex =
        /<figure>\s*<figcaption\s+class="imageDescription"([^>]*?)\s+id="([^"]+)"([^>]*?)>([\s\S]*?)<\/figcaption>\s*<\/figure>/gi;

    const newContent = content.replace(regex, (match, beforeId, id, afterId, captionText) => {
        // Очищаем старый номер
        let cleaned = captionText
            .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
            .replace(/^\d+\.\s*/, '')
            .trim();

        const newCaption = `${prefix} ${counter}. ${cleaned}`;
        const replacement = `<figure><figcaption class="imageDescription" id="${id}"${afterId}>${newCaption}</figcaption></figure>`;

        mapping.set(id, counter); // запоминаем новый номер для этого id
        counter++;
        return replacement;
    });

    return { newContent, newCounter: counter, figureMapping: mapping };
}

/**
 * Обновляет номера в тексте ссылок, ведущих на рисунки
 * @param {string} filePath - путь к md-файлу
 * @param {Map<string, number>} figureNumberMap - id -> новый номер
 * @param {string} defaultPrefix - префикс ('Рисунок' или 'Figure') – используется, если не удалось определить из ссылки
 */
function updateFigureLinksInFile(filePath, figureNumberMap, defaultPrefix) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Ищем markdown-ссылки: [текст](путь#anchor)
    const linkRegex = /\[([^\]]+)\]\(([^)]*?)(#fig-[^)]+)\)/g;

    const newContent = content.replace(linkRegex, (match, linkText, pathPart, anchor) => {
        const figId = anchor.substring(1);
        if (!figureNumberMap.has(figId)) return match;

        const newNumber = figureNumberMap.get(figId);

        // 1. Определяем, есть ли markdown-форматирование по краям
        let formatting = '';
        let innerText = linkText;

        // Поддерживаем: *...*, **...**, _..._, __...__
        const formatPatterns = [
            { regex: /^(\*{1,2})(.*?)\1$/, wrapper: '$1' }, // * или **
            { regex: /^(_{1,2})(.*?)\1$/, wrapper: '$1' }, // _ или __
        ];

        for (const pattern of formatPatterns) {
            const matchFormat = linkText.match(pattern.regex);
            if (matchFormat) {
                formatting = matchFormat[1];
                innerText = matchFormat[2];
                break;
            }
        }

        // 2. Очищаем innerText от старого префикса и номера (аналогично processFigureCaptions)
        let cleaned = innerText
            .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
            .replace(/^\d+\.\s*/, '')
            .trim();

        // 3. Определяем, какой префикс использовать (русский/английский) – лучше взять из конфига,
        //    но можно попробовать определить по исходному тексту ссылки
        let prefix = defaultPrefix;
        const prefixMatch = innerText.match(/^(Рисунок|Figure|Fig\.|Рис\.)\s*/i);
        if (prefixMatch) {
            prefix = prefixMatch[1];
        }

        // 4. Формируем новый текст внутри ссылки
        const newInnerText = `${prefix} ${newNumber}. ${cleaned}`;
        // Если было форматирование – оборачиваем, иначе оставляем как есть
        const newLinkText = formatting ? `${formatting}${newInnerText}${formatting}` : newInnerText;

        updated = true;
        return `[${newLinkText}](${pathPart}${anchor})`;
    });

    if (updated) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Обновлены ссылки в ${path.relative(process.cwd(), filePath)}`);
    }
}

/**
 * @param {string[]} files
 * @param {Map<any, any>} figureNumberMap
 * @param {string} defaultPrefix
 */
function updateAllLinks(files, figureNumberMap, defaultPrefix) {
    for (const file of files) {
        try {
            updateFigureLinksInFile(file, figureNumberMap, defaultPrefix);
        } catch (err) {
            console.error(`Ошибка обновления ссылок в ${file}:`, err);
        }
    }
}
module.exports = { reindexFigures };
