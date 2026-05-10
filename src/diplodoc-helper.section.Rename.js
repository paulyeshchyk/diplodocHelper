const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { promptSection } = require("./diplodoc-helper.utils.prompts");
const { isDiplodocSection } = require("./diplodoc-helper.utils.files");
const {
  readCurrentSectionIndex,
  updateIndexMdAdvanced,
  updateIndexYamlAdvanced,
  updateTocYamlTitle,
} = require("./diplodoc-helper.utils.files");
const {
  removeTocEntryByFolder,
  addTocEntry,
  updateParentIndexYaml,
} = require("./diplodoc-helper.utils.toc");
const { TEMPLATE_FOLDER_NAME } = require("./diplodoc-helper.utils.templates");

// ----------------------------------------------------------------------
// ОСНОВНАЯ ФУНКЦИЯ
// ----------------------------------------------------------------------
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
      "Переименовать можно только полноценный раздел (содержит index.md, index.yaml, toc.yaml)."
    );
    return;
  }

  const currentIndex = readCurrentSectionIndex(oldFolderPath);
  const newSectionObject = await promptSection(currentIndex);
  if (!newSectionObject) return;

  const finalIndex = newSectionObject.userIndex || "";
  const newFolderName = TEMPLATE_FOLDER_NAME(
    newSectionObject.newSectionType,
    newSectionObject.newPureTitle
  );
  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath)) {
    vscode.window.showErrorMessage(`Папка ${newFolderName} уже существует.`);
    return;
  }

  try {
    fs.accessSync(parentDir, fs.constants.W_OK);
  } catch {
    vscode.window.showErrorMessage(`Нет прав на запись в родительскую директорию ${parentDir}`);
    return;
  }

  const composedTitle =
    finalIndex !== ""
      ? `${newSectionObject.newSectionType.label} ${finalIndex}. ${newSectionObject.newPureTitle}`
      : newSectionObject.newPureTitle;

  // Удаляем старую запись из оглавления родителя
  removeTocEntryByFolder(parentDir, oldFolderName);
  updateParentIndexYaml(parentDir, oldFolderName, newFolderName, composedTitle);

  // Переименовываем папку
  try {
    fs.renameSync(oldFolderPath, newFolderPath);
  } catch (err) {
    // Откат: восстанавливаем запись в toc с старым именем папки
    addTocEntry(parentDir, composedTitle, oldFolderName);
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Не удалось переименовать папку: ${message}`);
    return;
  }

  // Обновляем содержимое файлов внутри переименованного раздела
  try {
    updateIndexMdAdvanced(
      newFolderPath,
      newSectionObject.newPureTitle,
      newSectionObject.newSectionType.name,
      newSectionObject.newSectionType.label,
      finalIndex
    );
    updateIndexYamlAdvanced(
      newFolderPath,
      newSectionObject.newPureTitle,
      newSectionObject.newSectionType.name,
      newSectionObject.newSectionType.label,
      finalIndex
    );
    updateTocYamlTitle(newFolderPath, composedTitle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(
      `Раздел переименован, но не удалось обновить содержимое файлов: ${message}`
    );
  }

  // Добавляем новую запись в оглавление родителя
  addTocEntry(parentDir, composedTitle, newFolderName);

  const indexValue = finalIndex ? `, индекс: ${finalIndex}` : "";
  vscode.window.showInformationMessage(
    `Раздел "${oldFolderName}" переименован в "${newFolderName}" (тип: ${newSectionObject.newSectionType.label}${indexValue})`
  );
}

module.exports = { renameSection };