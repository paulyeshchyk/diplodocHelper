// src/commands/diplodoc-helper.section.Rename.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { promptSection } = require('./vscode.prompts.js');
const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { DiplodocSectionRefresh } = require('../plugins/utils/diplodoc.flow.js');
const {
    IndexMdEntryReadIndex,
    IndexMdEntryReadTitle,
    IndexMdEntryReadSectionType,
} = require('../plugins/utils/md.index.entry.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { sortTocItems } = require('../plugins/utils/yaml.toc.sort.js');

const { DiplodocSectionPatch } = require('../plugins/utils/diplodoc.flow.js');

const {
    composeFullTitle,
    isIndexedSectionType,
    composeFolderName,
} = require('../plugins/utils/frontmatter.section.title.js');
const { updateLinksAfterRename } = require('./diplodoc-helper.links.md.js');
const { TocYamlEntryUpdateOrAppend } = require('../plugins/utils/yaml.toc.flow.js');

/**
 * @param {{ fsPath: any; }} uri
 */
async function ux_section_rename(uri) {
    if (!uri) return;

    const oldFolderPath = uri.fsPath;
    const oldFolderName = path.basename(oldFolderPath);
    const parentDir = path.dirname(oldFolderPath);

    if (!isDiplodocSection(oldFolderPath)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.rename.error.isnotsection));
        return;
    }

    const currentIndex = IndexMdEntryReadIndex(oldFolderPath);
    const currentPureTitle = IndexMdEntryReadTitle(oldFolderPath);
    const currentSectionType = IndexMdEntryReadSectionType(oldFolderPath);

    const newSectionObject = await promptSection(currentPureTitle, currentIndex);
    if (!newSectionObject) {
        console.log(translate(nls_ts.plugin.section.rename.error.interrupted));
        return;
    }

    let finalIndex = newSectionObject.userIndex?.trim() || '';
    const newPureTitle = newSectionObject.newPureTitle;
    const newSectionTypeObj = newSectionObject.newSectionType; // более понятное имя

    const isIndexChanged = currentIndex !== finalIndex;
    const isTypeChanged = currentSectionType !== newSectionTypeObj.value;
    const needSorting = isIndexChanged || isTypeChanged;

    // Нормализация индекса в зависимости от типа
    if (!isIndexedSectionType(newSectionTypeObj)) {
        finalIndex = '';
    }

    // Единое формирование полного заголовка
    const fullTitle = composeFullTitle(finalIndex, newSectionTypeObj, newPureTitle);

    // Имя папки
    const newFolderName = composeFolderName(finalIndex, newSectionTypeObj, newPureTitle);
    const newFolderPath = path.join(parentDir, newFolderName);

    // Проверка конфликта имени
    if (fs.existsSync(newFolderPath) && newFolderName !== oldFolderName) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.rename.error.folderexists, newFolderName));
        return;
    }

    let finalFolderName = oldFolderName;

    try {
        // 1. Обновляем/добавляем запись в TOC (до физического изменения)
        TocYamlEntryUpdateOrAppend(parentDir, oldFolderName, fullTitle, finalFolderName);

        // 2. Переименовываем папку + обновляем index.md (если нужно)
        if (newFolderName !== oldFolderName) {
            finalFolderName = DiplodocSectionPatch(oldFolderPath, newPureTitle, newSectionTypeObj, finalIndex);
            finalFolderName = path.basename(finalFolderName); // на всякий случай
        } else {
            DiplodocSectionRefresh(
                oldFolderPath,
                newPureTitle,
                newSectionTypeObj.name,
                newSectionTypeObj.value,
                finalIndex
            );
        }

        // 3. Обновляем ссылки после физического переименования
        const projectRoot = getLanguageRoot(parentDir);
        const effectiveOldPath = oldFolderPath; // для обновления ссылок
        const effectiveNewPath = path.join(parentDir, finalFolderName);

        await updateLinksAfterRename(effectiveOldPath, effectiveNewPath, projectRoot, '**удалено**');

        // 4. Сортировка при необходимости
        if (needSorting) {
            console.log('Параметры сортировки изменились. Запускаем sortTocItems...');
            sortTocItems(parentDir);
        } else {
            console.log('Изменилось только имя. Сортировка пропущена.');
        }

        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.section.rename.info.success, oldFolderName, finalFolderName)
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.rename.error.critical, msg));

        console.error('[Rename] Критическая ошибка:', err);
    }
}

module.exports = { ux_section_rename };
