const fs = require('fs');

const { findFiles } = require('./diplodoc-helper.files');
const { updateLinksInContent } = require('./diplodoc-helper.links.md');
const path = require('path');

/**
 * Вычисляет новые содержимые для всех .md-файлов, где ссылки нужно трансформировать.
 * @param {string} projectRoot
 * @param {(absoluteTarget: string) => string | null | undefined} transformTarget
 * @param {string} stubText
 * @returns {Promise<Map<string, string>>} mapFilePath -> newContent
 */
async function computeUpdatedLinks(projectRoot, transformTarget, stubText = '**удалено**') {
    const files = await findFiles(projectRoot, '.md');
    const result = new Map();

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = updateLinksInContent(content, filePath, transformTarget, stubText);
        if (newContent !== content) {
            result.set(filePath, newContent);
        }
    }
    return result;
}

/**
 * @param {string} parentDir
 * @param {string} folderName
 */
function computeTocAfterRemove(parentDir, folderName) {
    const tocPath = path.join(parentDir, 'toc.yaml');
    const content = fs.readFileSync(tocPath, 'utf8');
    // ... парсим, удаляем запись, сериализуем обратно
    // return newContent;
}

/**
 * @param {Array<string>} filePaths
 */
function checkWriteAccess(filePaths) {
    for (const p of filePaths) {
        try {
            fs.accessSync(p, fs.constants.W_OK);
        } catch (err) {
            throw new Error(`Нет прав на запись в ${p}`);
        }
    }
}

/**
 * @param {Array<string>} paths
 */
function checkDeleteAccess(paths) {
    for (const p of paths) {
        // Проверка: родительская директория должна быть доступна на запись
        const parent = path.dirname(p);
        try {
            fs.accessSync(parent, fs.constants.W_OK);
        } catch (err) {
            throw new Error(`Нет прав на удаление ${p} (нет прав в родительской папке)`);
        }
    }
}

module.exports = { checkDeleteAccess, checkWriteAccess, computeTocAfterRemove, computeUpdatedLinks };
