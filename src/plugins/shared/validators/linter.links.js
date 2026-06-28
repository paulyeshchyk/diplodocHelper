// src/plugins/linter/linter.links.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/** @import TocYaml from('../utils/yaml.toc.file') */

/**
 * Загружает toc.yaml и возвращает объект
 * @param {string} tocPath
 * @returns {TocYaml}
 */
function loadTocYaml(tocPath) {
    const content = fs.readFileSync(tocPath, 'utf8');
    return yaml.load(content);
}

/**
 * @typedef {Object} LinkLinterMessage
 * @property {string} filePath
 * @property {number} line
 * @property {number} character
 * @property {string} linkUrl
 * @property {string} severity *
 */

/**
 * @typedef {Object} LinkLinterResult
 * @property {boolean} success
 * @property {number} totalErrors
 * @property {number} totalWarnings
 * @property {Array<LinkLinterMessage>} errors
 * @property {string} [reason]
 * @property {Array<string>} allMdFiles
 *
 */

/**
 * Проверяет наличие якоря в содержимом файла
 * @param {string} content - содержимое файла
 * @param {string} anchor - якорь (без #)
 * @returns {boolean} - true, если якорь найден
 */
function hasAnchor(content, anchor) {
    // Экранируем спецсимволы для RegExp
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Ищем id="anchor" или name="anchor" с учётом пробелов и кавычек
    const regex = new RegExp(`(?:id|name)\\s*=\\s*["']${escaped}["']`, 'i');
    return regex.test(content);
}

/**
 * Рекурсивный сбор всех .md-файлов в порядке следования в toc.yaml
 * @param {any[]} entries - массив элементов toc
 * @param {string} rootDir - корень проекта
 * @param {string} currentPath - относительный путь от корня
 * @param {Set<string>} visited - для предотвращения циклов
 * @returns {string[]} - массив абсолютных путей к .md-файлам
 */
function collectMdFiles(entries, rootDir, currentPath = '', visited = new Set()) {
    if (!entries) return [];

    const items = Array.isArray(entries) ? entries : [entries];
    let files = [];

    for (const entry of items) {
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

        if (entry.include?.path) {
            const includeRelPath = entry.include.path;
            const absIncludePath = path.join(rootDir, currentPath, includeRelPath);
            const canonical = path.resolve(absIncludePath);

            if (!visited.has(canonical)) {
                visited.add(canonical);
                try {
                    const includeToc = loadTocYaml(absIncludePath);
                    const subItems = includeToc.items || [];
                    const includeDir = path.join(currentPath, path.dirname(includeRelPath));
                    const includeFiles = collectMdFiles(subItems, rootDir, includeDir, visited);
                    files.push(...includeFiles);
                } catch (err) {
                    let msg = err instanceof Error ? err.message : String(err);
                    console.error(`Не удалось загрузить include ${absIncludePath}:`, msg);
                }
            }
        }

        if (Array.isArray(entry.items)) {
            const subFiles = collectMdFiles(entry.items, rootDir, currentPath, visited);
            files.push(...subFiles);
        }
    }

    return files;
}

/**
 * Преобразует индекс символа в позицию (строка, столбец) в тексте
 * @param {string} text - весь текст
 * @param {number} index - индекс символа (0-based)
 * @returns {{ line: number, character: number }} - позиция (0-based)
 */
function getLineAndCharacter(text, index) {
    const lines = text.slice(0, index).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return { line, character };
}

/**
 * Основная функция линтера
 * @param {string} rootDir - абсолютный путь к корню проекта
 * @returns {LinkLinterResult}
 */
function lintInternalLinks(rootDir) {
    console.log('🔍 Проверка внутренних ссылок и якорей...');

    const tocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        console.warn('⚠️  toc.yaml не найден');
        return { success: false, reason: 'no_toc', totalErrors: 0, totalWarnings: 0, errors: [], allMdFiles: [] };
    }

    let tocDoc;
    try {
        tocDoc = loadTocYaml(tocPath);
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        console.error('❌ Ошибка загрузки toc.yaml:', msg);
        return { success: false, reason: 'parse_error', totalErrors: 0, totalWarnings: 0, errors: [], allMdFiles: [] };
    }

    const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items || [];
    const allMdFiles = collectMdFiles(entries, rootDir);

    if (allMdFiles.length === 0) {
        console.log('ℹ️  MD-файлы не найдены.');
        return { success: true, totalErrors: 0, totalWarnings: 0, errors: [], allMdFiles: allMdFiles };
    }

    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    /** @type {Array<LinkLinterMessage>} */
    const errors = []; // содержит объекты с полями filePath, line, character, linkUrl, severity
    const fileContentCache = new Map(); // кэш содержимого файлов

    for (const mdFilePath of allMdFiles) {
        try {
            const content = fs.readFileSync(mdFilePath, 'utf8');
            let match;

            while ((match = linkRegex.exec(content)) !== null) {
                const linkUrl = match[2].trim();
                if (linkUrl === '' || linkUrl.startsWith('#')) continue;
                if (/^(https?:\/\/|ftp:\/\/|mailto:|www\.|data:)/i.test(linkUrl) || linkUrl.startsWith('//')) {
                    continue;
                }

                // Разделяем путь и якорь
                const hashIndex = linkUrl.indexOf('#');
                let pathPart = linkUrl;
                let anchor = null;
                if (hashIndex !== -1) {
                    pathPart = linkUrl.substring(0, hashIndex);
                    anchor = linkUrl.substring(hashIndex + 1);
                }
                if (pathPart === '') continue;

                // Декодируем URL-encoded символы в пути (например, %20 -> пробел, %D0%90 -> А)
                let decodedPathPart;
                try {
                    decodedPathPart = decodeURIComponent(pathPart);
                } catch {
                    // Если декодирование не удалось (например, из-за некорректной кодировки),
                    // используем исходный путь как есть
                    decodedPathPart = pathPart;
                }

                // Преобразуем в абсолютный путь
                const absPath = path.resolve(path.dirname(mdFilePath), decodedPathPart);
                let targetPath = absPath;
                let exists = fs.existsSync(targetPath);
                if (!exists && !targetPath.endsWith('.md')) {
                    const indexMd = path.join(targetPath, 'index.md');
                    if (fs.existsSync(indexMd)) {
                        targetPath = indexMd;
                        exists = true;
                    }
                }

                // Получаем позицию ссылки
                const startIndex = match.index;
                const pos = getLineAndCharacter(content, startIndex);

                if (!exists) {
                    // Битая ссылка → ошибка
                    errors.push({
                        filePath: mdFilePath,
                        line: pos.line,
                        character: pos.character,
                        linkUrl: linkUrl,
                        severity: 'error',
                    });
                    continue;
                }

                // Если есть якорь, проверяем его наличие
                if (anchor) {
                    // Получаем содержимое целевого файла (из кэша)
                    let targetContent = fileContentCache.get(targetPath);
                    if (targetContent === undefined) {
                        try {
                            targetContent = fs.readFileSync(targetPath, 'utf8');
                            fileContentCache.set(targetPath, targetContent);
                        } catch {
                            // Если не удалось прочитать файл (ошибка доступа), считаем якорь невалидным
                            targetContent = null;
                        }
                    }

                    if (targetContent === null || !hasAnchor(targetContent, anchor)) {
                        // Якорь не найден → предупреждение
                        errors.push({
                            filePath: mdFilePath,
                            line: pos.line,
                            character: pos.character,
                            linkUrl: linkUrl,
                            severity: 'warning',
                        });
                    }
                }
            }
        } catch (err) {
            let msg = err instanceof Error ? err.message : String(err);
            console.error(`❌ Ошибка обработки ${mdFilePath}:`, msg);
        }
    }

    const totalErrors = errors.filter(e => e.severity === 'error').length;
    const totalWarnings = errors.filter(e => e.severity === 'warning').length;

    // Вывод в консоль
    console.log(`\n📊 Найдено ошибок: ${totalErrors}, предупреждений: ${totalWarnings}`);
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
        allMdFiles: allMdFiles,
    };
}

module.exports = { lintInternalLinks };
