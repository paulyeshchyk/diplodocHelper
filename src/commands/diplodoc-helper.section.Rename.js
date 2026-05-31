// src/commands/diplodoc-helper.section.Rename.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { promptSection } = require('./vscode.prompts.js');
const { IndexMdEntryReadTitle } = require('../plugins/utils');
const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { IndexMdEntryPatch } = require('../plugins/utils/diplodoc.flow.js');
const { IndexMdEntryReadIndex } = require('../plugins/utils/md.index.entry.js');
const { updateLinksAfterRename } = require('./vscode.linksUpdater.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { sortTocItems } = require('../plugins/utils/yaml.toc.sort.js');

const { TocYamlEntryRemove, TocYamlEntryCreate } = require('../plugins/utils/yaml.toc.entry.js');
const { renameSectionFolderIfNeeded } = require('../plugins/utils/diplodoc.flow.js');

const {
    composeFullTitle,
    isIndexedSectionType,
    composeFolderName,
} = require('../plugins/utils/frontmatter.section.title.js');

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
    const newSectionObject = await promptSection(currentPureTitle, currentIndex);
    if (!newSectionObject) {
        console.log(translate(nls_ts.plugin.section.rename.error.interrupted));
        return;
    }

    let finalIndex = newSectionObject.userIndex?.trim() || '';
    const newPureTitle = newSectionObject.newPureTitle;
    const newSectionType = newSectionObject.newSectionType;

    // Нормализация индекса в зависимости от типа
    const isIndexed = isIndexedSectionType(newSectionType);
    if (!isIndexed) finalIndex = ''; // игнорируем индекс для неиндексируемых типов

    // Единое формирование полного заголовка
    const fullTitle = composeFullTitle(finalIndex, newSectionType, newPureTitle);

    // Имя папки
    const newFolderName = composeFolderName(finalIndex, newSectionType, newPureTitle);

    const newFolderPath = path.join(parentDir, newFolderName);

    if (fs.existsSync(newFolderPath) && newFolderName !== oldFolderName) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.rename.error.folderexists, newFolderName));
        return;
    }

    // 1. Удаляем старую запись из родительского toc
    TocYamlEntryRemove(parentDir, oldFolderName);

    let finalFolderName = oldFolderName;

    try {
        // 2. Переименовываем папку (если нужно)
        if (newFolderName !== oldFolderName) {
            finalFolderName = renameSectionFolderIfNeeded(
                oldFolderPath,
                newPureTitle,
                newSectionObject.newSectionType,
                finalIndex
            );
        } else {
            // Просто обновляем содержимое без переименования папки
            IndexMdEntryPatch(
                oldFolderPath,
                newPureTitle,
                newSectionObject.newSectionType.name,
                newSectionObject.newSectionType.value,
                finalIndex
            );
        }

        // 3. Добавляем новую запись в родительский toc
        TocYamlEntryCreate(parentDir, fullTitle, finalFolderName, newSectionObject.newSectionType.value, finalIndex);

        // 4. Обновление ссылок
        const projectRoot = getLanguageRoot(parentDir);
        await updateLinksAfterRename(oldFolderPath, newFolderPath, projectRoot);

        // 5. Сортировка родительского toc.yaml по индексам
        sortTocItems(parentDir); // сортировка по возрастанию, неиндексированные внизу

        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.section.rename.info.success, oldFolderName, finalFolderName)
        );
    } catch (err) {
        let msg = err instanceof Error ? err.message : `${err}`;
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.rename.error.critical, msg));
    }
}

module.exports = { ux_section_rename };
