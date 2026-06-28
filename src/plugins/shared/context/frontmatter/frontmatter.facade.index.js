// src/core/indexer.js

const fs = require('fs');
const path = require('path');
const { frontmatterGet } = require('./frontmatter.facade');
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require('../../../model/frontmatter.model');

/**
 * @param {string} targetDir
 */
function frontmatterCalculateNextIndex(targetDir) {
    const parentIndexPath = path.join(targetDir, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(parentIndexPath)) return '1'; // Фоллбек, если родителя нет

    const parentContent = fs.readFileSync(parentIndexPath, 'utf8');
    const parentIndex = String(frontmatterGet(parentContent, 'sectionIndex') || '');

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    /** @type {number[]} */
    const siblingIndices = [];

    for (const item of items) {
        if (!item.isDirectory()) continue;

        const indexPath = path.join(targetDir, item.name, FrontMatterFiles.INDEX_MD);
        if (!fs.existsSync(indexPath)) continue;

        try {
            frontmatterGetSectionIndex(indexPath, siblingIndices);
        } catch (e) {
            console.error(`Ошибка при чтении ${indexPath}:`, e);
            continue; // Пропускаем проблемный файл вместо падения
        }
    }

    // Безопасный поиск максимума без оператора '...'
    const maxIdx = siblingIndices.reduce((a, b) => Math.max(a, b), 0);
    const nextSubNumber = maxIdx + 1;

    return parentIndex === '' ? `${nextSubNumber}` : `${parentIndex}.${nextSubNumber}`;
}

/**
 * @param {fs.PathOrFileDescriptor} indexPath
 * @param {number[]} siblingIndices
 */
function frontmatterGetSectionIndex(indexPath, siblingIndices) {
    const content = fs.readFileSync(indexPath, 'utf8');
    const sectionType = frontmatterGet(content, 'sectionType');
    // Принудительно приводим к строке, чтобы split не падал
    const sectionIndex = String(frontmatterGet(content, 'sectionIndex') || '');

    if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
        const parts = sectionIndex.split('.');
        const lastPart = parts[parts.length - 1];
        const lastNum = parseInt(lastPart, 10);

        if (!isNaN(lastNum)) {
            siblingIndices.push(lastNum);
        }
    }
}

module.exports = { frontmatterCalculateNextIndex };
