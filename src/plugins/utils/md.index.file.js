const fs = require('fs');
const path = require('path');
const { FrontMatterFiles, FrontMatterMeta } = require('../model/frontmatter.model');

// === Функции для Rename (обновление метаданных) ===

const { parse, stringify } = require('./frontmatter.utils');
const { TEMPLATE_FINAL_TITLE } = require('../model/frontmatter.templates');

/**
 * @param {string} folderPath
 * @returns {import("../model/section.model").SectionInfo?}
 */
function IndexMdFileRead(folderPath) {
    const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(indexPath)) return null;

    const content = fs.readFileSync(indexPath, 'utf8');
    const data = parse(content);
    return data.data;
}

/**
 * Обновляет index.md
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function IndexMdFilePatch(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex) {
    console.log(`IndexMdFilePatch:  ${folderPath}\\ ${sectionLabel}\\ ${pureTitle}`);
    const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(indexPath)) return;

    const content = fs.readFileSync(indexPath, 'utf8');
    let { data, content: body } = parse(content);

    const composedTitle = sectionIndex ? `${sectionLabel} ${sectionIndex}. ${pureTitle}` : pureTitle;

    data.title = composedTitle;
    data.pureTitle = pureTitle;
    data.sectionType = sectionTypeName;
    if (sectionIndex) {
        data.sectionIndex = sectionIndex;
    } else {
        delete data.sectionIndex;
    }

    fs.writeFileSync(indexPath, stringify(data, body), 'utf8');
}

/**
 * Универсальная функция: создаёт index.md если его нет, или обновляет если существует
 * @param {string} folderPath - путь к папке
 * @param {string} pureTitle - чистое название
 * @param {string} sectionTypeName - например "Chapter"
 * @param {string} sectionLabel - например "Глава"
 * @param {string|number} [sectionIndex] - например "14"
 */
function IndexMdUpsert(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex = '') {
    const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);

    const composedTitle = TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, pureTitle);

    let data = {};
    let body = '';

    if (fs.existsSync(indexPath)) {
        // === Обновление существующего файла ===
        console.log(`IndexMdUpsert (update): ${folderPath}`);
        const content = fs.readFileSync(indexPath, 'utf8');
        const parsed = parse(content);

        data = parsed.data || {};
        body = parsed.content || '';
    } else {
        // === Создание нового файла ===
        console.log(`IndexMdUpsert (create): ${folderPath}`);
    }

    // === Обновляем / заполняем метаданные ===
    data[FrontMatterMeta.TITLE] = composedTitle;
    data[FrontMatterMeta.PURETITLE] = pureTitle;
    data[FrontMatterMeta.SECTIONTYPE] = sectionTypeName;

    if (sectionIndex && String(sectionIndex).trim() !== '') {
        data[FrontMatterMeta.SECTIONINDEX] = String(sectionIndex).trim();
    } else {
        delete data[FrontMatterMeta.SECTIONINDEX];
    }

    // Можно добавить description по аналогии с index.yaml, если нужно:
    // data.description = `Описывает ${composedTitle}`;

    const output = stringify(data, body);

    fs.writeFileSync(indexPath, output, 'utf8');
}

module.exports = {
    IndexMdUpsert,
    IndexMdFileRead,
    IndexMdFilePatch,
};
