// src/commands/diplodoc-helper.section.Rename.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { promptSection, IndexMdEntryReadTitle } = require("../utils");
const { isDiplodocSection } = require("../utils");
const { IndexMdEntryReadIndex, IndexMdEntryPatch } = require("../utils");

const {
  TocYamlEntryRemove,
  TocYamlEntryCreate,

  renameSectionFolderIfNeeded,
} = require("../utils");

const { TEMPLATE_FOLDER_NAME } = require("../utils");

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

  const finalIndex = newSectionObject.userIndex?.trim() || "";

  const newPureTitle = newSectionObject.newPureTitle;

  const newFolderName = TEMPLATE_FOLDER_NAME(
    newSectionObject.newSectionType,
    newPureTitle,
    finalIndex,
  );

  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath) && newFolderName !== oldFolderName) {
    vscode.window.showErrorMessage(`Папка ${newFolderName} уже существует.`);
    return;
  }

  const composedTitle = finalIndex
    ? `${newSectionObject.newSectionType.label} ${finalIndex}. ${newPureTitle}`
    : newPureTitle;

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
      composedTitle,
      finalFolderName,
      newSectionObject.newSectionType.value,
      finalIndex,
    );

    vscode.window.showInformationMessage(
      `Раздел переименован: "${oldFolderName}"  "${finalFolderName}"`,
    );
  } catch (err) {
    let msg = err instanceof Error ? err.message : `${err}`;
    vscode.window.showErrorMessage(`Ошибка при переименовании: ${msg}`);
  }
}

module.exports = { renameSection };
