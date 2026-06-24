// src/commands/diplodoc-helper.files.js

const fs = require('fs');
const path = require('path');

/**
 * @param {string} absoluteTarget
 * @param {Set<string>} deletedTree
 * @param {string | fs.PathLike} deletedRoot
 * @returns {boolean}
 */
function isTargetInDeletedTree(absoluteTarget, deletedTree, deletedRoot) {
    if (deletedTree.has(absoluteTarget)) {
        return true;
    }
    // Проверка через startsWith для подпапок
    return absoluteTarget.startsWith(deletedRoot + path.sep);
}

/**
 * Возвращает Set абсолютных путей всех файлов и папок внутри удаляемого дерева
 * @param {fs.PathLike} rootDir — корень удаляемого раздела
 * @param {string} filter
 * @returns {Set<string>}
 */
function findDirectories(rootDir, filter) {
    const tree = new Set();
    const stack = [rootDir];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        if (tree.has(current)) continue;
        tree.add(current);

        try {
            const entries = fs.readdirSync(current, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(String(current), entry.name);
                if (entry.isDirectory()) {
                    stack.push(fullPath);
                } else if (entry.name.endsWith(filter)) {
                    tree.add(fullPath);
                }
            }
        } catch (err) {
            console.error(`findDirectories error: ${err}`);
        }
    }
    return tree;
}

/**
 * @typedef {Object} Reference
 * @property {fs.PathLike} filePath
 * @property {string} relativePath
 * @property {number} linkCount
 */

/**
 * @param {string } dir
 * @param {string } extension
 * @returns {Promise<Array<string>>}
 */
async function findFiles(dir, extension) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!entry.name.startsWith('.')) {
                // пропускаем скрытые
                files.push(...(await findFiles(fullPath, extension)));
            }
        } else if (entry.name.endsWith(extension)) {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * @param {boolean} isDirectory
 * @param {fs.PathLike} deletedPath
 */
function removeFileOrDirectory(isDirectory, deletedPath) {
    if (isDirectory) {
        fs.rmSync(deletedPath, { recursive: true, force: true });
    } else {
        fs.unlinkSync(deletedPath);
    }
}

module.exports = {
    isTargetInDeletedTree,
    findDirectories,
    findFiles,
    removeFileOrDirectory,
};
