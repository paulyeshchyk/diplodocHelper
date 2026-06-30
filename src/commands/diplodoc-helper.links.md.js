// src/commands/diplodoc-helper.links.md.js

const path = require('path');
const fs = require('fs');

const { decodeLinkPath, encodePathSegments } = require('./diplodoc-helper.links.coder');
const { isTargetInDeletedTree, findFiles, findDirectories, removeFileOrDirectory } = require('./diplodoc-helper.files');
const { isExternalLink } = require('../plugins/shared/parser/md/mdLinks');

/** @import {Reference} from './diplodoc-helper.files.js' */

/**
 * @typedef {Object} MdLink
 * @property {string} full
 * @property {boolean} isImage
 * @property {string} text
 * @property {string} rawPath
 * @property {number} index
 */

/**
 * Парсинг markdown-ссылок
 * @param {string} text
 * @return {Array<MdLink>}
 */
function parseMarkdownLinks(text) {
    const regex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;

    /** @type {Array<MdLink>} */
    const links = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        links.push({
            full: match[0],
            isImage: match[1] === '!',
            text: match[2],
            rawPath: match[3],
            index: match.index,
        });
    }
    return links;
}

/**
 * @param {string} rawPath
 */
function splitMdPathQueryHash(rawPath) {
    let pathPart = rawPath;
    let hash = '';
    let query = '';

    const hashIndex = rawPath.indexOf('#');
    if (hashIndex !== -1) {
        hash = rawPath.slice(hashIndex);
        pathPart = rawPath.slice(0, hashIndex);
    }

    const queryIndex = pathPart.indexOf('?');
    if (queryIndex !== -1) {
        query = pathPart.slice(queryIndex);
        pathPart = pathPart.slice(0, queryIndex);
    }

    return { pathPart, query, hash };
}

/**
 * Основная функция обновления ссылок
 * @param {string} content
 * @param {string} currentFilePath
 * @param {{(a1:string) : string | null | undefined}} transformTarget
 * @param {string} stubText
 */
function updateLinksInContent(content, currentFilePath, transformTarget, stubText) {
    const links = parseMarkdownLinks(content);
    if (links.length === 0) return content;

    let result = '';
    let lastIndex = 0;

    for (const link of links) {
        result += content.slice(lastIndex, link.index);

        if (isExternalLink(link)) {
            result += link.full;
            lastIndex = link.index + link.full.length;
            continue;
        }

        const { pathPart, query, hash } = splitMdPathQueryHash(link.rawPath);
        const decodedPath = decodeLinkPath(pathPart);
        const absoluteTarget = path.resolve(path.dirname(currentFilePath), decodedPath);

        const transformResult = transformTarget(absoluteTarget);

        if (transformResult === undefined) {
            result += link.full;
        } else if (transformResult === null) {
            result += stubText || `**${link.text}** (удалено)`;
        } else if (typeof transformResult === 'string') {
            let newRelativePath = path.relative(path.dirname(currentFilePath), transformResult);
            newRelativePath = newRelativePath.split(path.sep).join('/');
            const encoded = encodePathSegments(newRelativePath);

            const prefix = link.isImage ? '!' : '';
            result += `${prefix}[${link.text}](${encoded}${query}${hash})`;
        } else {
            result += link.full;
        }

        lastIndex = link.index + link.full.length;
    }

    result += content.slice(lastIndex);
    return result;
}

/**
 * Универсальный обработчик проекта
 * @param {string} projectRoot
 * @param {{(a1:string) : string | null | undefined}} transformTarget
 * @param {string} stubText
 */
async function updateLinksInProject(projectRoot, transformTarget, stubText) {
    const files = await findFiles(projectRoot, '.md');

    for (const filePath of files) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const newContent = updateLinksInContent(content, filePath, transformTarget, stubText);

            if (newContent !== content) {
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`Обновлены ссылки: ${path.relative(projectRoot, filePath)}`);
            }
        } catch (err) {
            var msg = err instanceof Error ? err.message : String(err);
            console.warn(`Ошибка обработки ${filePath}:`, msg);
        }
    }
}

/* ====================== Публичный API ====================== */

/**
 * @param {string | any[]} oldFolderPath
 * @param {string} newFolderPath
 * @param {any} projectRoot
 * @param {string} stubText
 */
async function updateLinksAfterRename(oldFolderPath, newFolderPath, projectRoot, stubText) {
    const transform = /** @type {{(a1:string): string | null | undefined}}*/ absoluteTarget => {
        if (absoluteTarget === oldFolderPath || absoluteTarget.startsWith(oldFolderPath + path.sep)) {
            if (absoluteTarget === oldFolderPath) return newFolderPath;
            const rel = absoluteTarget.slice(oldFolderPath.length + 1);
            return path.join(newFolderPath, rel);
        }
        return undefined;
    };

    await updateLinksInProject(projectRoot, transform, stubText);
}

/**
 * @param {fs.PathLike} deletedPath
 * @param {any} projectRoot
 * @param {string} stubText
 */
async function updateLinksAfterFolderDelete(deletedPath, projectRoot, stubText) {
    const deletedTree = findDirectories(deletedPath, '.md');
    const transform = /** @type {(a1:string)=> string | null | undefined} */ absoluteTarget => {
        return isTargetInDeletedTree(absoluteTarget, deletedTree, deletedPath) ? null : undefined;
    };

    await updateLinksInProject(projectRoot, transform, stubText);
}

/**
 * Обновление ссылок после удаления одиночного файла
 * @param {string} deletedFilePath
 * @param {string} projectRoot
 * @param {string} stubText
 */
async function updateLinksAfterFileDelete(deletedFilePath, projectRoot, stubText) {
    const transform = /** @type {{(a1:string) : string | null | undefined}} */ absoluteTarget => {
        return absoluteTarget === deletedFilePath ? null : undefined;
    };

    await updateLinksInProject(projectRoot, transform, stubText);
}

/**
 * @param {Array<Reference>} references
 * @param {string} deletedPath
 * @param {string} projectRoot
 * @param {string} stubText
 */
async function updateLinksAfterDelete(references, deletedPath, projectRoot, stubText) {
    const isDirectory = fs.statSync(deletedPath).isDirectory();

    if (references.length > 0) {
        if (isDirectory) {
            await updateLinksAfterFolderDelete(deletedPath, projectRoot, stubText);
        } else {
            await updateLinksAfterFileDelete(deletedPath, projectRoot, stubText);
        }
    }
    removeFileOrDirectory(isDirectory, deletedPath);
}

module.exports = {
    updateLinksAfterDelete,
    updateLinksAfterRename,
    updateLinksInContent,
    parseMarkdownLinks,
    splitMdPathQueryHash,
};
