// src/plugins/reindexer/reindexer.figures.js

const fs = require('fs');
const path = require('path');

const { DiplodocConfigFromJson } = require('../manifest/config/diplodoc.config');
const { TocYamlFileLoad } = require('../utils/yaml.toc.flow');
const tocWalker = require('../utils/yaml.toc.walker');

/**
 * @import { DiplodocConfig } from '../manifest/config/diplodoc.config.model'
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

    /** @type {TocYaml?} */
    let tocDoc = TocYamlFileLoad(tocPath);
    if (!tocDoc) return { success: false, reason: 'parse_error', total: 0 };
    const options = {
        indexFiles: ['index.md', 'readme.md', 'index.en.md', 'README.md'],
        contentExtensions: ['.md', '.markdown'],
        skipFilenames: ['toc.yaml', 'index.yaml', '_sidebar.md'],
    };
    const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items || [];
    const allMdFiles = tocWalker.collectFilesInOrder(entries, rootDir, '', new Set(), options);

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
                figureCaptionTemplate,
                mdFilePath
            );

            for (const [uniqueKey, num] of figureMapping) {
                globalFigureMapping.set(uniqueKey, num);
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
 * @param {string} content
 * @param {number} startCounter
 * @param {string} prefix
 * @returns {{newContent: string;newCounter: number;figureMapping: Map<string, number>;}}
 * @param {string} mdFilePath
 */
function processFigureCaptions(content, startCounter, prefix, mdFilePath) {
    let counter = startCounter;
    const mapping = new Map();

    const regex =
        /<figure>\s*<figcaption\s+class="imageDescription"([^>]*?)\s+id="([^"]+)"([^>]*?)>([\s\S]*?)<\/figcaption>\s*<\/figure>/gi;

    const newContent = content.replace(regex, (match, beforeId, id, afterId, captionText) => {
        let cleaned = captionText
            .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
            .replace(/^\d+\.\s*/, '')
            .trim();

        const newCaption = `${prefix} ${counter}. ${cleaned}`;
        const replacement = `<figure><figcaption class="imageDescription" id="${id}"${afterId}>${newCaption}</figcaption></figure>`;

        // Формируем уникальный ключ для глобальной карты
        const uniqueKey = `${path.resolve(mdFilePath)}::${id}`;
        mapping.set(uniqueKey, counter);

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

        // ВЫЧИСЛЯЕМ АБСОЛЮТНЫЙ ПУТЬ К ЦЕЛЕВОМУ MD-ФАЙЛУ
        let targetMdPath;
        if (!pathPart || pathPart.trim() === '') {
            // Ссылка внутри того же файла
            targetMdPath = path.resolve(filePath);
        } else {
            // Ссылка на другой файл (вычисляем относительно текущего filePath)
            targetMdPath = path.resolve(path.dirname(filePath), pathPart);
        }

        // Собираем составной ключ для поиска в глобальном маппинге
        const uniqueKey = `${targetMdPath}::${figId}`;

        // Проверяем по составному ключу
        if (!figureNumberMap.has(uniqueKey)) return match;
        const newNumber = figureNumberMap.get(uniqueKey);

        let innerText = linkText;
        const formatPatterns = [
            { regex: /^(\*{1,2})(.*?)\1$/, wrapper: '$1' },
            { regex: /^(_{1,2})(.*?)\1$/, wrapper: '$1' },
        ];
        for (const pattern of formatPatterns) {
            const matchFormat = linkText.match(pattern.regex);
            if (matchFormat) {
                innerText = matchFormat[2];
                break;
            }
        }

        let template = defaultTemplate;
        if (/(рис|Рисунок|Рис\.)/i.test(innerText)) {
            template = '(рис. {0})';
        } else if (/(fig|Figure|Fig\.)/i.test(innerText)) {
            template = '(fig. {0})';
        }

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
