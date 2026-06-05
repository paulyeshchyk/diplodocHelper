const fs = require('fs');
const path = require('path');

const { TocYamlFileLoad } = require('../utils/yaml.toc.file');
const { DiplodocConfigFromJson } = require('../utils/diplodoc.config');

/**
 * @import { DiplodocConfig } from '../../config/model/diplodoc.config.model'
 */

/** @param {string} rootDir
 * @param {string | undefined} targetLocale
 * @param {string | object | undefined} configJsonOrObj
 */
function reindexFigures(rootDir, targetLocale, configJsonOrObj) {
    console.log('Переиндексация рисунков...');
    const figureCaptionTemplate = readFigureCaptionTemplate(configJsonOrObj, targetLocale);
    const figureReferenceCaptionTemplate = readFigureReferenceCaptionTemplate(configJsonOrObj, targetLocale);

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
                figureCaptionTemplate
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
    updateAllLinks(allMdFiles, globalFigureMapping, figureReferenceCaptionTemplate);

    console.log(`Готово. Всего пронумеровано: ${figureCounter - 1}`);
    return { success: true, total: figureCounter - 1, reason: '' };
}

/**
 * @param {string | object | undefined} configJsonOrObj
 * @param {string | undefined} targetLocale
 */
function readFigureCaptionTemplate(configJsonOrObj, targetLocale) {
    let config = DiplodocConfigFromJson(configJsonOrObj);
    const activeLocale = targetLocale || config.defaultLanguage || 'ru';
    return GetPrefixOrDefault(config, activeLocale, targetLocale);
}

/**
 * @param {string | object | undefined} configJsonOrObj
 * @param {string | undefined} targetLocale
 */
function readFigureReferenceCaptionTemplate(configJsonOrObj, targetLocale) {
    let config = DiplodocConfigFromJson(configJsonOrObj);
    const activeLocale = targetLocale || config.defaultLanguage || 'ru';
    return GetReferencePrefixOrDefault(config, activeLocale, targetLocale);
}

/**
 * @param {DiplodocConfig} config
 * @param {string} activeLocale
 * @param {string | undefined} targetLocale
 */
function GetReferencePrefixOrDefault(config, activeLocale, targetLocale) {
    return activeLocale !== targetLocale ? 'Figure' : config.figureReferenceCaptionPrefix || '(fig. {0})';
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

    const items = Array.isArray(entries) ? entries : [entries];
    let files = [];

    for (const entry of items) {
        // 1. Сначала добавляем файл текущего элемента (href)
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

        // 2. Затем обрабатываем include (подключаемый toc.yaml) – его файлы встают после текущего
        if (entry.include?.path) {
            const includeRelPath = entry.include.path;
            const absIncludePath = path.join(rootDir, currentPath, includeRelPath);
            const canonical = path.resolve(absIncludePath);

            if (!visited.has(canonical)) {
                visited.add(canonical);
                try {
                    const toc = TocYamlFileLoad(absIncludePath);
                    const subItems = toc.items;
                    const includeDir = path.join(currentPath, path.dirname(includeRelPath));
                    const includeFiles = collectMdFilesInOrder(subItems, rootDir, includeDir, visited);
                    files.push(...includeFiles);
                } catch (err) {
                    let msg = err instanceof Error ? err.message : String(err);
                    console.error(`Не удалось загрузить include ${absIncludePath}:`, msg);
                }
            }
        }

        // 3. И только потом – вложенные подразделы (items) – они идут после всего вышеперечисленного
        if (Array.isArray(entry.items)) {
            const subFiles = collectMdFilesInOrder(entry.items, rootDir, currentPath, visited);
            files.push(...subFiles);
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
 * @param {string} defaultTemplate - префикс ('(рис. {0})' или '(fig. {0})') – используется, если не удалось определить из ссылки
 */
function updateFigureLinksInFile(filePath, figureNumberMap, defaultTemplate) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Ищем markdown-ссылки: [текст](путь#anchor)
    const linkRegex = /\[([^\]]+)\]\(([^)]*?)(#fig-[^)]+)\)/g;

    const newContent = content.replace(linkRegex, (match, linkText, pathPart, anchor) => {
        const figId = anchor.substring(1);
        if (!figureNumberMap.has(figId)) return match;

        const newNumber = figureNumberMap.get(figId);

        // 1. Определяем markdown-форматирование по краям
        //let formatting = '';
        let innerText = linkText;
        const formatPatterns = [
            { regex: /^(\*{1,2})(.*?)\1$/, wrapper: '$1' },
            { regex: /^(_{1,2})(.*?)\1$/, wrapper: '$1' },
        ];
        for (const pattern of formatPatterns) {
            const matchFormat = linkText.match(pattern.regex);
            if (matchFormat) {
                //formatting = matchFormat[1];
                innerText = matchFormat[2];
                break;
            }
        }

        // 3. Определяем, какой шаблон использовать (русский или английский)
        let template = defaultTemplate;
        if (/(рис|Рисунок|Рис\.)/i.test(innerText)) {
            template = '(рис. {0})';
        } else if (/(fig|Figure|Fig\.)/i.test(innerText)) {
            template = '(fig. {0})';
        }

        // 4. Формируем новый текст ссылки
        const newLinkText = template.replace('{0}', (newNumber ?? '').toString());

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
