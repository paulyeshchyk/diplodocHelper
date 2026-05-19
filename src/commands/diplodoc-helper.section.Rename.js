// src/commands/diplodoc-helper.section.Rename.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { promptSection, IndexMdEntryReadTitle } = require("../utils");
const { isDiplodocSection } = require("../utils");
const { IndexMdEntryReadIndex, IndexMdEntryPatch } = require("../utils");
const { updateLinksAfterRename } = require("../utils/linksUpdater")
const { getLanguageRoot } = require("../utils/directory")

const {
  TocYamlEntryRemove,
  TocYamlEntryCreate,

  renameSectionFolderIfNeeded,
} = require("../utils");

const { composeFullTitle, isIndexedSectionType, composeFolderName } = require("../utils/sectionTitle")

/**
 * @param {{ fsPath: any; }} uri
 */
async function renameSection(uri) {
  if (!uri) return;

  const oldFolderPath = uri.fsPath;
  const oldFolderName = path.basename(oldFolderPath);
  const parentDir = path.dirname(oldFolderPath);

  if (!isDiplodocSection(oldFolderPath)) {
    vscode.window.showErrorMessage(
      "Переименовать можно только полноценный раздел.",
    );
    return;
  }

  const currentIndex = IndexMdEntryReadIndex(oldFolderPath);
  const currentPureTitle = IndexMdEntryReadTitle(oldFolderPath);
  const newSectionObject = await promptSection(currentPureTitle, currentIndex);
  if (!newSectionObject) {
    console.log("объект не будет переименован: ввод данных прерван");
    return;
  }

  let finalIndex = newSectionObject.userIndex?.trim() || "";
  const newPureTitle = newSectionObject.newPureTitle;
  const newSectionType = newSectionObject.newSectionType;

  // Нормализация индекса в зависимости от типа
  const isIndexed = isIndexedSectionType(newSectionType);
  if (!isIndexed) finalIndex = ""; // игнорируем индекс для неиндексируемых типов

  // Единое формирование полного заголовка
  const fullTitle = composeFullTitle(finalIndex, newSectionType, newPureTitle);

  // Имя папки
  const newFolderName = composeFolderName(finalIndex, newSectionType, newPureTitle);

  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath) && newFolderName !== oldFolderName) {
    vscode.window.showErrorMessage(`Папка ${newFolderName} уже существует.`);
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
        finalIndex,
      );
    } else {
      // Просто обновляем содержимое без переименования папки
      IndexMdEntryPatch(
        oldFolderPath,
        newPureTitle,
        newSectionObject.newSectionType.name,
        newSectionObject.newSectionType.value,
        finalIndex,
      );
    }

    // 3. Добавляем новую запись в родительский toc
    TocYamlEntryCreate(
      parentDir,
      fullTitle,
      finalFolderName,
      newSectionObject.newSectionType.value,
      finalIndex,
    );

    // 4. Обновление ссылок
    const projectRoot = getLanguageRoot(parentDir);
    const updatedFiles = await updateLinksAfterRename(oldFolderPath, newFolderPath, projectRoot);

    vscode.window.showInformationMessage(
      `Раздел переименован: "${oldFolderName}"  "${finalFolderName}"`,
    );
  } catch (err) {
    let msg = err instanceof Error ? err.message : `${err}`;
    vscode.window.showErrorMessage(`Ошибка при переименовании: ${msg}`);
  }
}

module.exports = { renameSection };
