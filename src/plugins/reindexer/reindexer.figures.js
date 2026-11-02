// src/plugins/reindexer/reindexer.figures.js

const fs = require('fs');
const path = require('path');

const { TocYamlFileLoad } = require('../utils/yaml.toc.file');
const { DiplodocConfigFromJson } = require('../manifest/config/diplodoc.config');
const { collectMdFilesInOrder } = require('../utils/toc.order');

/**
 * @import { DiplodocConfig } from '../manifest/config/diplodoc.config.model'
 */

/** 
 * @param {string} rootDir
 * @param {string | undefined} targetLocale
 * @param {string | object | undefined} configJsonOrObj
 */
function reindexFigures(rootDir, targetLocale, configJsonOrObj) {
    const figureCaptionTemplate = readFigureCaptionTemplate(configJsonOrObj, targetLocale);
    const figureReferenceCaptionTemplate = readFigureReferenceCaptionTemplate(configJsonOrObj, targetLocale);

    const tocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        console.warn('⚠️ toc.yaml не найден');
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
                figureCaptionTemplate,
                mdFilePath
            );

            for (const [uniqueKey, num] of figureMapping) {
                globalFigureMapping.set(uniqueKey, num);
            }

            if (newContent !== content) {
                fs.writeFileSync(mdFilePath, newContent, 'utf8');
            }
            figureCounter = newCounter;
        } catch (err) {
            console.error(`❌ Ошибка обработки ${mdFilePath}:`, err);
        }
    }

    // ---- ВТОРОЙ ПРОХОД: обновляем ссылки ----
    updateAllLinks(allMdFiles, globalFigureMapping, figureReferenceCaptionTemplate);

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
 * @param {string} mdFilePath
 * @returns {{newContent: string; newCounter: number; figureMapping: Map<string, number>;}}
 */
function processFigureCaptions(content, startCounter, prefix, mdFilePath) {
    let counter = startCounter;
    const mapping = new Map();

    // Группа 1: Любые блоки кода (`...`, ````...````, <code>...</code>), которые ИГНОРИРУЕМ.
    // Группа 2: Сам тег <figcaption>, который ОБРАБАТЫВАЕМ.
    const skipAndMatchRegex = /(```[\s\S]*?```|`[^`\n]+`|<code\b[^>]*>[\s\S]*?<\/code>)|(<figcaption\s+class="imageDescription"([^>]*?)\s+id="([^"]+)"([^>]*?)>([\s\S]*?)<\/figcaption>)/gi;

    const newContent = content.replace(skipAndMatchRegex, (fullMatch, codeBlock, figCaptionBlock, beforeId, id, afterId, captionText) => {
        // Если сработал захват кодового экрана (группа 1) — возвращаем фрагмент без изменений
        if (codeBlock) {
            return codeBlock;
        }

        // Иначе обработка тега <figcaption> (группа 2)
        let cleaned = captionText
            .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
            .replace(/^\d+\.\s*/, '')
            .trim();

        const newCaption = `${prefix} ${counter}. ${cleaned}`;
        const replacement = `<figcaption class="imageDescription" id="${id}"${afterId}>${newCaption}</figcaption>`;

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

    // Регулярка также защищена маской экранов (код блоки / inline бэктики / <code>)
    const linkRegex = /(```[\s\S]*?```|`[^`\n]+`|<code\b[^>]*>[\s\S]*?<\/code>)|(\[([^\]]+)\]\(([^)]*?)(#fig-[^)]+)\))/g;

    const newContent = content.replace(linkRegex, (fullMatch, codeBlock, linkMatch, linkText, pathPart, anchor) => {
        // Игнорируем ссылки внутри экранов кода
        if (codeBlock) {
            return codeBlock;
        }

        const figId = anchor.substring(1);

        let targetMdPath;
        if (!pathPart || pathPart.trim() === '') {
            targetMdPath = path.resolve(filePath);
        } else {
            targetMdPath = path.resolve(path.dirname(filePath), pathPart);
        }

        const uniqueKey = `${targetMdPath}::${figId}`;

        if (!figureNumberMap.has(uniqueKey)) return fullMatch;
        const newNumber = figureNumberMap.get(uniqueKey);

        let innerText = linkText;
        const formatPatterns = [
            { regex: /^(\*{1,2})(.*?)\1$/, wrapper: '$1' }, { regex: /^(_{1,2})(.*?)\1$/, wrapper: '$1' },
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
            console.error(`❌ Ошибка обновления ссылок в ${file}:`, err);
        }
    }
}

module.exports = { reindexFigures };