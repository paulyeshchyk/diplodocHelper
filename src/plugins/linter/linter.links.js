// src/plugins/linter/linter.links.js

const fs = require('fs');
const path = require('path');

const tocWalker = require('../utils/yaml.toc.walker');
const { TocYamlFileLoad } = require('../utils/yaml.toc.flow');

/**
 * @typedef {Object} LinkLinterMessage
 * @property {string} filePath
 * @property {number} line
 * @property {number} character
 * @property {string} linkUrl
 * @property {'error' | 'warning'} severity
 */

/**
 * @typedef {Object} LinkLinterResult
 * @property {boolean} success
 * @property {number} totalErrors
 * @property {number} totalWarnings
 * @property {LinkLinterMessage[]} errors
 * @property {string} [reason]
 * @property {string[]} allMdFiles
 */

// ====================== Вспомогательные функции ======================

/**
 * Проверяет наличие якоря в markdown-файле
 * @param {string?} content
 * @param {string} anchor
 * @returns {boolean}
 */
function hasAnchor(content, anchor) {
    if (!content) return false;
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:id|name)\\s*=\\s*["']${escaped}["']`, 'i');
    return regex.test(content);
}

/**
 * Преобразует индекс символа в {line, character}
 * @param {string} text
 * @param {number} index
 * @returns {{line: number, character: number}}
 */
function getLineAndCharacter(text, index) {
    const lines = text.slice(0, index).split('\n');
    return {
        line: lines.length - 1,
        character: lines[lines.length - 1].length,
    };
}

/**
 * Проверяет одну ссылку
 * @param {string} content
 * @param {RegExpExecArray} match
 * @param {string} mdFilePath
 * @param {string} rootDir
 * @param {Map<string, string>} fileContentCache
 * @returns {LinkLinterMessage | null}
 */
function checkLink(content, match, mdFilePath, rootDir, fileContentCache) {
    const linkUrl = match[2].trim();
    if (!linkUrl || linkUrl.startsWith('#')) return null;

    // Пропускаем внешние ссылки
    if (/^(https?:\/\/|ftp:\/\/|mailto:|www\.|data:)/i.test(linkUrl) || linkUrl.startsWith('//')) {
        return null;
    }

    const hashIndex = linkUrl.indexOf('#');
    const pathPart = hashIndex !== -1 ? linkUrl.substring(0, hashIndex) : linkUrl;
    const anchor = hashIndex !== -1 ? linkUrl.substring(hashIndex + 1) : null;

    if (!pathPart) return null;

    let decodedPathPart;
    try {
        decodedPathPart = decodeURIComponent(pathPart);
    } catch {
        decodedPathPart = pathPart;
    }

    const absPath = path.resolve(path.dirname(mdFilePath), decodedPathPart);
    let targetPath = absPath;
    let exists = fs.existsSync(targetPath);

    // Попытка добавить индексный файл
    if (!exists && !targetPath.endsWith('.md')) {
        const indexMd = path.join(targetPath, 'index.md');
        if (fs.existsSync(indexMd)) {
            targetPath = indexMd;
            exists = true;
        }
    }

    const startIndex = match.index;
    const pos = getLineAndCharacter(content, startIndex);

    if (!exists) {
        return {
            filePath: mdFilePath,
            line: pos.line,
            character: pos.character,
            linkUrl,
            severity: 'error',
        };
    }

    // Проверка якоря
    if (anchor) {
        let targetContent = fileContentCache.get(targetPath) ?? null;
        if (!targetContent) {
            try {
                targetContent = fs.readFileSync(targetPath, 'utf8');
                fileContentCache.set(targetPath, targetContent);
            } catch {
                targetContent = null;
            }
        }

        if (targetContent === null || !hasAnchor(targetContent, anchor)) {
            return {
                filePath: mdFilePath,
                line: pos.line,
                character: pos.character,
                linkUrl,
                severity: 'warning',
            };
        }
    }

    return null;
}

// ====================== Основная функция ======================

/**
 * Линтер внутренних ссылок и якорей
 * @param {string} rootDir
 * @returns {LinkLinterResult}
 */
function lintInternalLinks(rootDir) {
    console.log('🔍 Проверка внутренних ссылок и якорей...');

    const tocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        console.warn('toc.yaml не найден');
        return {
            success: false,
            reason: 'no_toc',
            totalErrors: 0,
            totalWarnings: 0,
            errors: [],
            allMdFiles: [],
        };
    }

    const tocDoc = TocYamlFileLoad(tocPath);
    if (!tocDoc) {
        return {
            success: false,
            reason: 'parse_error',
            totalErrors: 0,
            totalWarnings: 0,
            errors: [],
            allMdFiles: [],
        };
    }

    const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items || [];

    const allMdFiles = tocWalker.collectFilesInOrder(entries, rootDir, '', new Set(), {
        indexFiles: ['index.md'],
        contentExtensions: ['.md'],
        skipFilenames: ['toc.yaml', 'index.yaml'],
    });

    if (allMdFiles.length === 0) {
        console.log('MD-файлы не найдены.');
        return {
            success: true,
            totalErrors: 0,
            totalWarnings: 0,
            errors: [],
            allMdFiles,
        };
    }

    const errors = buildErrors(allMdFiles, rootDir);

    const totalErrors = errors.filter(e => e.severity === 'error').length;
    const totalWarnings = errors.filter(e => e.severity === 'warning').length;

    // Вывод результатов
    console.log(`\nНайдено ошибок: ${totalErrors}, предупреждений: ${totalWarnings}`);
    errors.forEach(e => {
        const prefix = e.severity === 'error' ? '❌' : '⚠️';
        console.log(
            `   ${prefix} ${path.relative(rootDir, e.filePath)}:${e.line + 1}:${e.character + 1} -> ${e.linkUrl}`
        );
    });

    return {
        success: true,
        totalErrors,
        totalWarnings,
        errors,
        allMdFiles,
    };
}

/**
 * @param {string[]} allMdFiles
 * @param {string} rootDir
 */
function buildErrors(allMdFiles, rootDir) {
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    /** @type {LinkLinterMessage[]} */
    const errors = [];
    const fileContentCache = new Map();

    for (const mdFilePath of allMdFiles) {
        try {
            const content = fs.readFileSync(mdFilePath, 'utf8');
            let match;

            while ((match = linkRegex.exec(content)) !== null) {
                const message = checkLink(content, match, mdFilePath, rootDir, fileContentCache);
                if (message) {
                    errors.push(message);
                }
            }
        } catch (err) {
            console.error(`Ошибка обработки ${mdFilePath}:`, err);
        }
    }
    return errors;
}

module.exports = { lintInternalLinks };
