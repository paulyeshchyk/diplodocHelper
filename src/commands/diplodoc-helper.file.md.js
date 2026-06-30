// src/commands/diplodoc.helper.file.md.js

const fs = require('fs');
const path = require('path');

const { findFiles, isTargetInDeletedTree, findDirectories } = require('./diplodoc-helper.files');
const { parseMarkdownLinks, splitMdPathQueryHash } = require('./diplodoc-helper.links.md.js');
const { decodeLinkPath } = require('./diplodoc-helper.links.coder.js');
const { isExternalLink } = require('../plugins/shared/parser/md/mdLinks');

/**
 * @typedef {Object} FileReference
 * @property {string} filePath
 * @property {string} relativePath
 * @property {number} linkCount
 */

/**
 * Поиск ссылок на конкретный файл
 * @param {string} targetFilePath
 * @param {string} projectRoot
 * @returns {Promise<Array<FileReference>>}
 */
async function findReferencesToMdFile(targetFilePath, projectRoot) {
    try {
        const references = [];
        const allMdFiles = await findFiles(projectRoot, '.md');

        for (const filePath of allMdFiles) {
            if (filePath === targetFilePath) continue;

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const links = parseMarkdownLinks(content);
                let count = 0;

                for (const link of links) {
                    if (isExternalLink(link)) continue;

                    const { pathPart } = splitMdPathQueryHash(link.rawPath);
                    const decodedPath = decodeLinkPath(pathPart);
                    const absoluteTarget = path.resolve(path.dirname(filePath), decodedPath);

                    if (absoluteTarget === targetFilePath) {
                        count++;
                    }
                }

                if (count > 0) {
                    references.push({
                        filePath,
                        relativePath: path.relative(projectRoot, filePath),
                        linkCount: count,
                    });
                }
            } catch {
                console.warn(`Ошибка анализа ${filePath}`);
            }
        }

        references.sort((a, b) => b.linkCount - a.linkCount);
        return references;
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        console.warn('Ошибка поиска ссылок:', msg);
        return [];
    }
}

/**
 * Поиск внешних ссылок на удаляемое дерево
 * @param {string | fs.PathLike} targetFolderPath
 * @param {string} projectRoot
 * @returns {Promise<Array<FileReference>>}
 */
async function findReferencesToMdSection(targetFolderPath, projectRoot) {
    let references = [];
    try {
        const deletedTree = findDirectories(targetFolderPath, '.md');
        const allMdFiles = await findFiles(projectRoot, '.md');

        for (const filePath of allMdFiles) {
            if (isTargetInDeletedTree(filePath, deletedTree, targetFolderPath)) continue;

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const links = parseMarkdownLinks(content);
                let count = 0;

                for (const link of links) {
                    if (isExternalLink(link)) continue;

                    const { pathPart } = splitMdPathQueryHash(link.rawPath);
                    const decoded = decodeLinkPath(pathPart);
                    const absoluteTarget = path.resolve(path.dirname(filePath), decoded);

                    if (isTargetInDeletedTree(absoluteTarget, deletedTree, targetFolderPath)) {
                        count++;
                    }
                }

                if (count > 0) {
                    references.push({
                        filePath,
                        relativePath: path.relative(projectRoot, filePath),
                        linkCount: count,
                    });
                }
            } catch {
                console.warn(`Ошибка анализа ${filePath}`);
            }
        }

        references.sort((a, b) => b.linkCount - a.linkCount);
        return references;
    } catch (err) {
        console.warn('Ошибка поиска ссылок:', err);
        return [];
    }
}

/**
 * @param {string} deletedPath
 * @param {string} projectRoot
 * @returns {Promise<Array<FileReference>>}
 */
async function buildMdFileReferences(deletedPath, projectRoot) {
    let isDirectory = fs.statSync(deletedPath).isDirectory();
    if (isDirectory) {
        return await findReferencesToMdSection(deletedPath, projectRoot);
    } else {
        return await findReferencesToMdFile(deletedPath, projectRoot);
    }
}

module.exports = { findReferencesToMdFile, findReferencesToMdSection, buildMdFileReferences };
