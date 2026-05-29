// diplodoc.flow.js

const fs = require('fs');
const path = require('path');

/** @import { SectionTypeOption } from './diplodocTypes' */
/** @import { CreateFolderResult } from './directory' */
const { TEMPLATE_FOLDER_NAME } = require('../utils/templates');

const { TocYamlEntryPatchReference } = require('../utils/toc.yaml.entry');
const { IndexMdFilePatch } = require('../utils/index.md.file');
const { IndexYamlEntryPatchSection } = require('../utils/index.yaml.entry');
const { TocYamlEntryPatchTitle } = require('../utils/toc.yaml.entry');
const { composeFullTitle } = require('../utils/sectionTitle');

const { canCreateFolder, createDirectory } = require('./directory');

/**
 * @param {string} targetDir
 * @param {SectionTypeOption} sectionType
 * @param {string} sectionName
 * @param {string | undefined} sectionIndex
 * @returns {CreateFolderResult?}
 */
function createSectionFolder(targetDir, sectionType, sectionName, sectionIndex) {
    const folderName = TEMPLATE_FOLDER_NAME(sectionType, sectionName, sectionIndex);
    const newFolderPath = path.join(targetDir, folderName);

    return createDirectory(canCreateFolder, newFolderPath, true, folderName);
}

/**
 * Полностью обновляет index.md И index.yaml раздела при изменении индекса/заголовка
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {string} sectionIndex
 */
function IndexMdEntryPatch(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex = '') {
    const sectionTypeOpt = {
        value: sectionLabel,
        name: sectionTypeName,
        label: '',
        description: '',
    };
    const composedTitle = composeFullTitle(sectionIndex, sectionTypeOpt, pureTitle);

    // index.md используем gray-matter (это frontmatter)
    IndexMdFilePatch(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex);

    // index.yaml обычный YAML, gray-matter здесь не нужен!
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
function renameSectionFolderIfNeeded(folderPath, pureTitle, sectionType, sectionIndex = '') {
    const oldFolderName = path.basename(folderPath);
    const newFolderName = TEMPLATE_FOLDER_NAME(sectionType, pureTitle, sectionIndex);
    console.log(`renameSectionFolderIfNeeded:\n from: ${oldFolderName}\n   to: ${newFolderName}`);

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

        return newFolderName;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Не удалось переименовать ${oldFolderName}:`, msg);
        return oldFolderName;
    }
}

module.exports = {
    createSectionFolder,
    IndexMdEntryPatch,
    renameSectionFolderIfNeeded,
};
