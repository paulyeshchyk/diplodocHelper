// toc.yaml.entry.js

const fs = require('fs');
const path = require('path');
const { IndexYamlEntryPatchHRef } = require('./index.yaml.entry');

const { FrontMatterFiles } = require('./constants');
const { getTocIndentation, indentedTocEntry, normalizeEmptyLines } = require('./toc.yaml.utils');

/**
 * @param {string} value
 */
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} parentDir
 * @param {any} folderName
 */
function TocYamlEntryRemove(parentDir, folderName) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    let content = fs.readFileSync(tocPath, 'utf8');
    const var_part = escapeRegExp(folderName);

    // Собираем паттерн:
    // 1. Начало блока
    // 2. Обязательный href именем папки
    // 3. Жадный захват всего контента, пока не встретим новый "- name:" или конец файла
    const pattern = `^[ \\t]*- name:.*\\r?\\n[ \\t]*href:[ \\t]*${var_part}/index\\.md(?:(?!\\r?\\n[ \\t]*- name:)[\\s\\S])*`;

    const regex = new RegExp(pattern, 'gm');

    // Удаляем блок и подчищаем лишние переносы строк, которые могли остаться
    content = content.replace(regex, '');

    fs.writeFileSync(tocPath, normalizeEmptyLines(content), 'utf8');
}

/**
 * @param {string} parentDir
 * @param {string} composedTitle
 * @param {string} folderName
 * @param {any} sectionType
 * @param {string | undefined} sectionIndex
 */
function TocYamlEntryCreate(parentDir, composedTitle, folderName, sectionType, sectionIndex) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    console.log(`unused sectionType ${sectionType} & sectionIndex ${sectionIndex}`);

    let content = fs.readFileSync(tocPath, 'utf8');
    const indent = getTocIndentation(parentDir) || '';
    const newEntry = indentedTocEntry(indent, composedTitle, folderName);

    if (!content.includes('items:')) {
        content = content.trimEnd() + '\nitems:\n' + newEntry;
    } else {
        content = content.trimEnd() + '\n' + newEntry;
    }
    fs.writeFileSync(tocPath, normalizeEmptyLines(content), 'utf8');
}

/**
 * @param {{ items: any; }} tocDoc
 * @param {any} folderName
 * @param {any} newName
 */
function TocYamlEntryPatch(tocDoc, folderName, newName) {
    if (!tocDoc?.items) return;
    for (const item of tocDoc.items) {
        if (item.href && item.href.includes(folderName)) {
            item.name = newName;
        }
    }
}

/**
 * Обновляет заголовок в toc.yaml раздела
 * @param {string} folderPath
 * @param {any} composedTitle
 */
function TocYamlEntryPatchTitle(folderPath, composedTitle) {
    const tocPath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    let content = fs.readFileSync(tocPath, 'utf8');
    const regex = /(title:\s*)(.*)/;
    content = content.replace(regex, `$1${composedTitle}`);
    fs.writeFileSync(tocPath, content, 'utf8');
}

const { TEMPLATE_PARENT_TOC_YAML } = require('./templates');

/**
 * @param {string} parentDir
 * @param {any} sectionTitle
 * @param {any} sectionTypeLabel
 * @param {any} folderName
 * @param {any} sectionIndex
 */
function TocYamlEntryPatchItems(parentDir, sectionTitle, sectionTypeLabel, folderName, sectionIndex) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    let content = fs.readFileSync(tocPath, 'utf8');
    const newItemEntry = TEMPLATE_PARENT_TOC_YAML(sectionTitle, sectionTypeLabel, folderName, sectionIndex);

    if (!content.includes('items:')) {
        content = content.trimEnd() + '\nitems:\n' + newItemEntry;
    } else {
        content = content.trimEnd() + '\n' + newItemEntry;
    }

    fs.writeFileSync(tocPath, content, 'utf8');
}

/**
 * Обновляет все ссылки на папку в родительском toc.yaml и index.yaml
 * @param {string} parentDir
 * @param {string | RegExp} oldFolderName
 * @param {string} newFolderName
 */
function TocYamlEntryPatchReference(parentDir, oldFolderName, newFolderName) {
    // Обновляем toc.yaml родителя
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (fs.existsSync(tocPath)) {
        let content = fs.readFileSync(tocPath, 'utf8');
        content = content.replace(new RegExp(oldFolderName, 'g'), newFolderName);
        fs.writeFileSync(tocPath, content, 'utf8');
    }

    // Обновляем index.yaml родителя
    IndexYamlEntryPatchHRef(parentDir, oldFolderName, newFolderName, ''); // composedTitle не нужен здесь
}

module.exports = {
    TocYamlEntryCreate,
    TocYamlEntryRemove,
    TocYamlEntryPatch,
    TocYamlEntryPatchTitle,
    TocYamlEntryPatchItems,
    TocYamlEntryPatchReference,
};
