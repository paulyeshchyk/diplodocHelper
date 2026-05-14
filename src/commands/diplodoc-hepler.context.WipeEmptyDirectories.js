const vscode = require("vscode");

const { cleanupEmptyDirectories, getLanguageRoot } = require("../utils");

/**
 * Очистка пустых папок после реиндексации
 * @param {{ fsPath: any; }} uri
 */
async function wipeEmptyDirectories(uri) {
  if (!uri) return;

  const languageRoot = getLanguageRoot(uri.fsPath); // если функция доступна
  const success = cleanupEmptyDirectories(uri.fsPath, languageRoot);

  if (success) {
    vscode.window.showInformationMessage(`Папки очищены "${uri}"`);
  }
}

module.exports = { wipeEmptyDirectories };
