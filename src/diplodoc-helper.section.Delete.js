// diplodoc-helper.section.Delete.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { isDiplodocSection } = require("./diplodoc-helper.utils.files");
const { removeTocEntryByFolder } = require("./diplodoc-helper.utils.toc");

/**
 * Основная функция удаления раздела.
 * @param {{ fsPath: string; }} uri
 */
async function deleteSection(uri) {
  if (!uri) return;

  const targetDir = uri.fsPath;
  const folderName = path.basename(targetDir);
  const parentDir = path.dirname(targetDir);

  // 1. Проверка: является ли папка разделом?
  if (!isDiplodocSection(targetDir)) {
    vscode.window.showWarningMessage(
      "Выбранная папка не является разделом (отсутствуют index.md, index.yaml или toc.yaml). Воспользуйтесь стандартным удалением VS Code."
    );
    return;
  }

  // 2. Подтверждение удаления
  const confirm = await vscode.window.showWarningMessage(
    `Вы действительно хотите БЕЗВОЗВРАТНО удалить раздел "${folderName}" и все его содержимое?`,
    { modal: true },
    "Удалить"
  );
  if (confirm !== "Удалить") return;

  // 3. Удаление
  try {
    // Убираем ссылку из родительского оглавления
    removeTocEntryByFolder(parentDir, folderName);

    // Рекурсивное удаление папки
    fs.rmSync(targetDir, { recursive: true, force: true });

    vscode.window.showInformationMessage(`Раздел "${folderName}" и упоминания в оглавлении удалены.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Ошибка при удалении: ${message}`);
  }
}

module.exports = { deleteSection };