// src/plugins/shared/services/diplodoc.frontmatter.service.context.js

const fs = require('fs');
const path = require('path');
const {
    frontmatterParse,
    frontmatterReplaceContent,
    frontmatterStringify,
    frontmatterRemove,
} = require('../context/frontmatter/frontmatter.facade');
const { diplodocFrontmatterGetTitleFromFile } = require('./diplodoc.frontmatter.service');
const { isDiplodocSection } = require('../../plugins/utils/path.directory');

/**
 * Извлекает значение context из frontmatter с помощью gray-matter
 * @param {string} fullPath
 * @param {string} langDir
 * @param {any} contextMap
 */
function diplodocFrontmatterExtractContextTagValue(fullPath, langDir, contextMap) {
    const content = fs.readFileSync(fullPath, 'utf8');

    const { data } = frontmatterParse(content);

    const contextValue = data.context;

    if (!contextValue || typeof contextValue !== 'string') {
        return;
    }

    // Надёжно разбиваем на отдельные термины
    const terms = contextValue
        .split(/[\s,]+/) // пробелы + запятые как разделители
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => t.toLowerCase());

    if (terms.length === 0) return;

    const displayTitle = diplodocFrontmatterGetTitleFromFile(fullPath, langDir);
    const relativeToLang = path.relative(langDir, fullPath).replace(/\\/g, '/');

    for (const term of terms) {
        if (!contextMap[term]) {
            contextMap[term] = { rank: 0, pages: [] };
        }
        contextMap[term].rank += 1;
        contextMap[term].pages.push({
            title: displayTitle,
            href: relativeToLang,
        });
    }
}

/**
 * Надёжно парсит строку в массив контекстов.
 * Поддерживает запятые, пробелы, несколько разделителей подряд.
 * Пустые значения игнорируются.
 * @param {string} input
 * @returns {string[]}
 */
function diplodocFrontmatterParseContexts(input) {
    if (!input || typeof input !== 'string') return [];

    return input
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}
/**
 * @param {string} indexMdPath
 * @returns {any[]}
 */
function diplodocFrontmatterReadContexts(indexMdPath) {
    /**
     * @type {any[]}
     */
    let currentContexts = [];
    if (fs.existsSync(indexMdPath)) {
        const content = fs.readFileSync(indexMdPath, 'utf8');
        const { data } = frontmatterParse(content);
        currentContexts = diplodocFrontmatterParseContexts(data.context || '');
    }
    return currentContexts;
}
/**
 * @param {string} sectionPath
 * @param {UpdateContextResult} [inputData] - данные для тестирования / не-интерактивного режима
 * @returns {Promise<UpdateResponse>}
 */
async function diplodocFrontmatterUpdateContext(sectionPath, inputData = {}) {
    if (!isDiplodocSection(sectionPath)) {
        return { success: false, error: 'incorrectSection' };
    }

    const indexMdPath = path.join(sectionPath, 'index.md');
    let currentContexts = diplodocFrontmatterReadContexts(indexMdPath);
    let finalContexts = [...currentContexts];

    // === Основная логика обновления контекстов ===
    if (currentContexts.length === 0) {
        // Создание первого контекста
        if (!inputData.newContext) {
            return { success: false, error: 'needInput' };
        }
        finalContexts = diplodocFrontmatterParseContexts(inputData.newContext);
    } else {
        // Добавление или редактирование
        if (inputData.action === 'add' && inputData.newContext) {
            const newOnes = diplodocFrontmatterParseContexts(inputData.newContext);
            for (const item of newOnes) {
                if (!finalContexts.includes(item)) {
                    finalContexts.push(item);
                }
            }
        } else if (inputData.action === 'edit' && inputData.oldValue && inputData.newContext) {
            const newParsed = diplodocFrontmatterParseContexts(inputData.newContext);
            finalContexts = finalContexts.filter(c => c !== inputData.oldValue);

            for (const item of newParsed) {
                if (!finalContexts.includes(item)) {
                    finalContexts.push(item);
                }
            }
        }
    }

    if (finalContexts.length === 0) {
        return { success: false, error: 'emptyContexts' };
    }

    const finalString = finalContexts.join(', ');

    try {
        frontmatterReplaceContent(indexMdPath, finalString);
        return { success: true, contexts: finalContexts, finalString };
    } catch (err) {
        return {
            success: false,
            error: 'critical',
            message: err instanceof Error ? err.message : String(err),
            finalString: '',
        };
    }
}

/**
 * @param {fs.PathOrFileDescriptor} indexMdPath
 * @param {any[]} contexts
 * @param {any} toDelete
 */
function diplodocFrontmatterDeleteContexts(indexMdPath, contexts, toDelete) {
    let content = fs.readFileSync(indexMdPath, 'utf8');
    const { data, content: body } = frontmatterParse(content);

    const remaining = contexts.filter((/** @type {any} */ c) => c !== toDelete);

    if (remaining.length === 0) {
        content = frontmatterRemove(content, 'context');
    } else {
        data.context = remaining.join(', ');
        content = frontmatterStringify(data, body);
    }

    fs.writeFileSync(indexMdPath, content, 'utf8');
}

module.exports = {
    diplodocFrontmatterDeleteContexts,
    diplodocFrontmatterUpdateContext,
    diplodocFrontmatterExtractContextTagValue,
    diplodocFrontmatterReadContexts,
    diplodocFrontmatterParseContexts,
};
