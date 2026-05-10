// src/commands/diplodoc-helper.section.Rename.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { promptSection } = require("../utils");
const { isDiplodocSection } = require("../utils");
const {
  readCurrentSectionIndex,
  updateIndexMdAdvanced,
  updateIndexYamlAdvanced,
  updateTocYamlTitle,
} = require("../utils"); // временно оставляем старые функции

const {
  removeTocEntryByFolder,
  addTocEntry,
  updateParentIndexYaml,
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

  const currentIndex = readCurrentSectionIndex(oldFolderPath);
  const newSectionObject = await promptSection(currentIndex);
  if (!newSectionObject) return;

  const finalIndex = newSectionObject.userIndex || "";
  const newFolderName = TEMPLATE_FOLDER_NAME(
    newSectionObject.newSectionType,
    newSectionObject.newPureTitle,
    currentIndex
  );
  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath)) {
    vscode.window.showErrorMessage(`Папка ${newFolderName} уже существует.`);
    return;
  }

  const composedTitle = finalIndex
    ? `${newSectionObject.newSectionType.label} ${finalIndex}. ${newSectionObject.newPureTitle}`
    : newSectionObject.newPureTitle;

  // Удаляем старую запись
  removeTocEntryByFolder(parentDir, oldFolderName);
  updateParentIndexYaml(parentDir, oldFolderName, newFolderName, composedTitle);

  try {
    fs.renameSync(oldFolderPath, newFolderPath);
  } catch (err) {
    addTocEntry(
      parentDir,
      composedTitle,
      oldFolderName,
      newSectionObject.newSectionType.label,
      finalIndex,
    );
    var msg = err instanceof Error ? err.message : "unknown";
    vscode.window.showErrorMessage(`Не удалось переименовать папку: ${msg}`);
    return;
  }

  try {
    updateIndexMdAdvanced(
      newFolderPath,
      newSectionObject.newPureTitle,
      newSectionObject.newSectionType.name,
      newSectionObject.newSectionType.label,
      finalIndex,
    );
    updateIndexYamlAdvanced(
      newFolderPath,
      newSectionObject.newPureTitle,
      newSectionObject.newSectionType.name,
      newSectionObject.newSectionType.label,
      finalIndex,
    );
    updateTocYamlTitle(newFolderPath, composedTitle);
  } catch (err) {
    var msg = err instanceof Error ? err.message : "unknown";
    vscode.window.showWarningMessage(
      `Раздел переименован, но не все файлы обновлены: ${msg}`,
    );
  }

  addTocEntry(
    parentDir,
    composedTitle,
    newFolderName,
    newSectionObject.newSectionType.label,
    finalIndex,
  );

  vscode.window.showInformationMessage(
    `Раздел "${oldFolderName}" → "${newFolderName}"`,
  );
}

module.exports = { renameSection };
