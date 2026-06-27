// src/utils/directory.js
const fs = require('fs');
const path = require('path');

const { FrontMatterFiles, FrontMatterFilesDefaultList } = require('../model/frontmatter.model');

/**
 * Проверяет, является ли папка полноценным разделом Diplodoc
 * @param {string} folderPath
 */
function isDiplodocSection(folderPath) {
    if (!folderPath || !fs.existsSync(folderPath)) return false;
    return FrontMatterFilesDefaultList.every(file => fs.existsSync(path.join(folderPath, file)));
}

/**
 * Проверяет, является ли папка корнем языка (docs/ru, docs/en)
 * @param {string} folderPath
 */
function isLanguageRoot(folderPath) {
    if (!folderPath || !fs.existsSync(folderPath)) return false;

    const hasToc = fs.existsSync(path.join(folderPath, FrontMatterFiles.TOC_YAML));
    const hasIndexMd = fs.existsSync(path.join(folderPath, FrontMatterFiles.INDEX_MD));

    return hasToc && !hasIndexMd;
}

/**
 * Надёжно определяет корень языка
 * @param {string} sourcePath
 */
function getLanguageRoot(sourcePath) {
    let current = path.dirname(sourcePath);

    while (current && current !== path.parse(current).root) {
        const basename = path.basename(current).toLowerCase();

        if (basename === 'docs') {
            const langCandidate = path.join(current, path.basename(path.dirname(sourcePath)));
            if (fs.existsSync(langCandidate) && isLanguageRoot(langCandidate)) {
                return langCandidate;
            }
            return current;
        }

        if (isLanguageRoot(current) && !isDiplodocSection(current)) {
            return current;
        }

        current = path.dirname(current);
    }

    // Fallback
    const parts = sourcePath.split(path.sep);
    const docsIndex = parts.findIndex(p => p.toLowerCase() === 'docs');
    if (docsIndex !== -1 && docsIndex + 1 < parts.length) {
        const langFolder = path.join(...parts.slice(0, docsIndex + 2));
        if (fs.existsSync(langFolder)) return langFolder;
    }

    return path.dirname(sourcePath);
}

/* ==================== Существующие функции ==================== */

/**
 * @param {string} folderPath
 * @param {(message: string) => void} onError
 */
function canCreateFolder(folderPath, onError) {
    if (fs.existsSync(folderPath)) {
        onError(`Путь уже существует: ${folderPath}`);
        return false;
    }
    try {
        fs.accessSync(path.dirname(folderPath), fs.constants.W_OK);
        return true;
    } catch {
        onError(`Нет прав на запись: ${path.dirname(folderPath)}`);
        return false;
    }
}

/**
 * @param {fs.PathLike} dirPath
 */
function isEmptyDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return true;
    try {
        return fs.readdirSync(dirPath).length === 0;
    } catch {
        return false;
    }
}

/**
 * @param {{(folderPath: string,onError:(message: string) => void): boolean}} canCreateFolder
 * @param {string} newFolderPath
 * @param {boolean} recursive
 * @param {string} folderName
 * @param {(message: string) => void} onError
 * @returns {CreateFolderResult?}
 */
function createDirectory(canCreateFolder, newFolderPath, recursive, folderName, onError) {
    if (!canCreateFolder(newFolderPath, onError)) return null;

    try {
        fs.mkdirSync(newFolderPath, { recursive: recursive });
        return { folderPath: newFolderPath, folderName: folderName };
    } catch (err) {
        console.error(err);
        return null;
    }
}

/**
 * @param {string} name
 */
function isValidName(name) {
    if (!name || name.trim().length === 0) return false;
    if (name.length > 255) return false;
    return true;
}
/**
 * Рекурсивно сканирует дерево сверху вниз и удаляет все пустые папки
 * @param {string} rootDir - корневая папка для сканирования
 * @param {string?} [stopAtPath] - не опускаться ниже этой папки (например, корень языка)
 * @returns {number} количество удалённых папок
 */
function cleanupEmptyDirectories(rootDir, stopAtPath = null) {
    if (!rootDir || !fs.existsSync(rootDir)) return 0;

    let deletedCount = 0;

    /**
     * @param {string} dir
     */
    function scan(dir) {
        // Не выходим за границы stopAtPath
        if (stopAtPath && path.relative(stopAtPath, dir).startsWith('..')) return;

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        // 1. Сначала рекурсивно обходим все подпапки
        for (const entry of entries) {
            if (entry.isDirectory()) {
                scan(path.join(dir, entry.name));
            }
        }

        // 2. После обработки детей проверяем, пустая ли текущая папка
        if (isEmptyDirectory(dir) && (!stopAtPath || dir !== stopAtPath)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`Удалена пустая папка: ${dir}`);
                deletedCount++;
            } catch (err) {
                var msg = err instanceof Error ? err.message : `{err}`;
                console.warn(`Не удалось удалить пустую папку ${dir}:`, msg);
            }
        }
    }

    scan(rootDir);
    return deletedCount;
}

/* ==================== Экспорт ==================== */

module.exports = {
    isValidName,
    canCreateFolder,
    createDirectory,
    isEmptyDirectory,
    cleanupEmptyDirectories,
    isDiplodocSection,
    isLanguageRoot,
    getLanguageRoot,
};
