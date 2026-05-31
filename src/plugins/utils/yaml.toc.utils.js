const fs = require('fs');
const path = require('path');
const { get } = require('./frontmatter.utils');

const { FrontMatterFiles, FrontMatterMeta, FrontMatterSectionTypesIndexed } = require('../model/frontmatter.model');

/**
 * @param {string} indent
 * @param {any} composedTitle
 * @param {any} folderName
 */
function indentedTocEntry(indent, composedTitle, folderName) {
    const result = [
        `${indent}- name: ${composedTitle}`,
        `${indent}  href: ${folderName}/index.md`,
        `${indent}  include:`,
        `${indent}    path: ${folderName}/toc.yaml`,
        `${indent}    mode: link`,
    ];
    return normalizeEmptyLines(result.join('\n'));
}

/**
 * @param {string} parentDir
 */
function getTocIndentation(parentDir) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return '  ';

    const content = fs.readFileSync(tocPath, 'utf8');
    const match = content.match(/^(\s*)- \s*name:/m);
    return match ? match[1] : '  ';
}

/**
 * @param {string} str
 */
function normalizeEmptyLines(str) {
    str = str.replace(/\r\n/g, '\n');
    str = str.replace(/\n\n/g, '\n');
    return str.replace(/(\r?\n[ \t]*){3,}/g, '\n').trimEnd() + '\n';
}

/**
 * Извлекает sectionIndex из блока элемента toc
 * @param {string} block
 * @param {string} baseDir
 */
function getIndexFromBlock(block, baseDir) {
    const hrefMatch = block.match(/href:\s+([^\s/]+)/);
    if (!hrefMatch) return null;

    const folderName = hrefMatch[1];
    const indexPath = path.join(baseDir, folderName, FrontMatterFiles.INDEX_MD);

    if (!fs.existsSync(indexPath)) return null;

    const content = fs.readFileSync(indexPath, 'utf8');
    const sectionType = get(content, FrontMatterMeta.SECTIONTYPE);

    if (!sectionType || !FrontMatterSectionTypesIndexed.includes(sectionType)) {
        return null;
    }

    return get(content, FrontMatterMeta.SECTIONINDEX) || null;
}

/**
 * @typedef {Object} TocBlocksAccumulator
 * @property {string} header
 * @property {string[]} blocks
 * @property {string[] | null} current
 */

/**
 * Разбивает toc.yaml на отдельные блоки элементов
 * @param {string} content
 * @returns {string[]}
 */
function splitTocIntoBlocks(content) {
    /** @type {TocBlocksAccumulator} */
    const acc = {
        header: '',
        blocks: [],
        current: null,
    };

    return content.split(/^(\s*-\s+name:)/m).reduce((accumulator, part, i) => {
        if (i === 0) {
            accumulator.header = part.trim();
            return accumulator;
        }

        if (i % 2 === 1) {
            // начало нового элемента (- name:)
            accumulator.current = [part];
        } else if (accumulator.current) {
            accumulator.current.push(part);
            accumulator.blocks.push(accumulator.current.join(''));
            accumulator.current = null;
        }

        return accumulator;
    }, acc).blocks;
}

module.exports = {
    indentedTocEntry,
    getTocIndentation,
    normalizeEmptyLines,
    getIndexFromBlock,
    splitTocIntoBlocks,
};
