// diplodoc.flow.js

const fs = require('fs');
const path = require('path');

/** @import { SectionTypeOption } from '../model/section.model' */
/** @import { CreateFolderResult } from './path.directory' */
const { TEMPLATE_FOLDER_NAME } = require('../model/frontmatter.templates');

const { TocYamlEntryPatchReference } = require('./yaml.toc.entry');
const { IndexMdFilePatch, IndexMdUpsert } = require('./md.index.file');
const { IndexYamlEntryPatchSection } = require('./yaml.index.flow');
const { TocYamlEntryPatchTitle } = require('./yaml.toc.entry');
const { composeFullTitle } = require('./frontmatter.section.title');

const { canCreateFolder, createDirectory } = require('./path.directory');
const { IndexYamlFileCreate, IndexYamlEntryPatch } = require('./yaml.base');

/**
 * @param {string} targetDir
 * @param {SectionTypeOption} sectionType
 * @param {string} sectionName
 * @param {string | undefined} sectionIndex
 * @param {(message: string) => void} onError
 * @returns {CreateFolderResult?}
 */
function createSectionFolder(targetDir, sectionType, sectionName, sectionIndex, onError) {
    const folderName = TEMPLATE_FOLDER_NAME(sectionType, sectionName, sectionIndex);
    const newFolderPath = path.join(targetDir, folderName);

    return createDirectory(canCreateFolder, newFolderPath, true, folderName, onError);
}

/**
 * Полностью обновляет index.md И index.yaml раздела при изменении индекса/заголовка
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {string} sectionIndex
 */
function DiplodocSectionRefresh(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex = '') {
    const sectionTypeOpt = {
        value: sectionLabel,
        name: sectionTypeName,
        label: '',
        description: '',
    };
    const composedTitle = composeFullTitle(sectionIndex, sectionTypeOpt, pureTitle);

    // index.md используем gray-matter (это frontmatter)
    IndexMdFilePatch(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex);

    // index.yaml обычный YAML
    IndexYamlEntryPatchSection(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex);

    // toc.yaml своего раздела
    TocYamlEntryPatchTitle(folderPath, composedTitle);
}

/**
 * Переименовывает папку раздела в правильный формат, если нужно
 * @param {string} folderPath - текущий путь к папке раздела
 * @param {string} pureTitle
 * @param {SectionTypeOption} sectionType
 * @param {string} sectionIndex
 * @returns {string} новое имя папки
 */
function DiplodocSectionPatch(folderPath, pureTitle, sectionType, sectionIndex = '') {
    const oldFolderName = path.basename(folderPath);
    const newFolderName = TEMPLATE_FOLDER_NAME(sectionType, pureTitle, sectionIndex);
    console.log(`DiplodocSectionPatch:\n from: ${oldFolderName}\n   to: ${newFolderName}`);

    if (oldFolderName === newFolderName) {
        return oldFolderName;
    }

    const parentDir = path.dirname(folderPath);
    const newFolderPath = path.join(parentDir, newFolderName);

    if (fs.existsSync(newFolderPath)) {
        console.warn(`Конфликт имён: ${newFolderName} уже существует. Папка ${oldFolderName} не переименована.`);
        return oldFolderName;
    }

    try {
        fs.renameSync(folderPath, newFolderPath);
        console.log(`   Переименована: ${oldFolderName}  ${newFolderName}`);

        // Обновляем ссылки в родителе
        TocYamlEntryPatchReference(parentDir, oldFolderName, newFolderName);

        const composedTitle = composeFullTitle(sectionIndex, sectionType, pureTitle);
        TocYamlEntryPatchTitle(newFolderPath, composedTitle);
        IndexYamlEntryPatch(newFolderPath, pureTitle, sectionType, sectionIndex);
        IndexMdUpsert(newFolderPath, pureTitle, sectionType.name, sectionType.value, sectionIndex);

        return newFolderName;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Не удалось переименовать ${oldFolderName}:`, msg);
        return oldFolderName;
    }
}

module.exports = {
    createSectionFolder,
    DiplodocSectionRefresh,
    DiplodocSectionPatch,
};
