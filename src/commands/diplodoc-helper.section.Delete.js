// src/commands/diplodoc-helper.section.Delete.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { isDiplodocSection } = require("../utils");
const { TocYamlEntryRemove } = require("../utils");

/**
 * @param {{ fsPath: string }} uri
 */
async function deleteSection(uri) {
  if (!uri) return;

  const targetDir = uri.fsPath;
  const folderName = path.basename(targetDir);
  const parentDir = path.dirname(targetDir);

  if (!isDiplodocSection(targetDir)) {
    vscode.window.showWarningMessage(
      "Выбранная папка не является разделом Diplodoc. Используйте стандартное удаление."
    );
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Удалить раздел "${folderName}" и всё его содержимое безвозвратно?`,
    { modal: true },
    "Удалить"
  );

  if (confirm !== "Удалить") return;

  try {
    TocYamlEntryRemove(parentDir, folderName);
    fs.rmSync(targetDir, { recursive: true, force: true });

    vscode.window.showInformationMessage(`Раздел "${folderName}" успешно удалён.`);
  } catch (err) {
    let msg = (err instanceof Error) ? err.message : `${err}`;
    vscode.window.showErrorMessage(`Ошибка при удалении: ${msg}`);
  }
}

module.exports = { deleteSection };