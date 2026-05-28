//diplodoc-helper.image.PasteFromClipboard.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getImageFromClipboard } = require('../utils/clipboard.image');

/**
 * Санитизация имени файла (без расширения)
 * @param {string} name
 */
function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/[^a-zA-Zа-яА-Я0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

/**
 * Основная команда
 */
async function pasteImageFromClipboard() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage(translate(nls_ts.paste.omage.error.noactiveeditor));
    return;
  }

  const document = editor.document;
  if (document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.mdfileonly));
    return;
  }

  const clipboardImage = await getImageFromClipboard();
  if (!clipboardImage) {
    vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.emptybuffer));
    return;
  }

  const mdDir = path.dirname(document.uri.fsPath);
  const imagesDir = path.join(mdDir, 'images');

  // Создаём папку images, если её нет
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // eslint-disable-next-line prettier/prettier
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19); // YYYY-MM-DD_HH-mm-SS

  const defaultFilename = translate(nls_ts.screenshot.name.prompt, timestamp);

  // 1. Запрашиваем название (пользователь может оставить дату или убрать)
  const userInput = await vscode.window.showInputBox({
    prompt: translate(nls_ts.screenshot.name.prompt),
    placeHolder: translate(nls_ts.screenshot.description.placeholder),
    value: defaultFilename,
    validateInput: value => {
      if (!value || value.trim().length === 0) {
        return 'Имя файла не может быть пустым';
      }

      const sanitized = sanitizeFilename(value);
      if (sanitized.length === 0) {
        return translate(nls_ts.screenshot.name.error.wrongcharacters);
      }

      const testPath = path.join(imagesDir, `${sanitized}.png`);
      if (fs.existsSync(testPath)) {
        return translate(nls_ts.filename.error.alreadyexists);
      }

      return null;
    },
  });

  if (!userInput) return; // пользователь отменил

  const fileName = `${sanitizeFilename(userInput)}.png`;
  const imagePath = path.join(imagesDir, fileName);

  try {
    // Финальная проверка перед записью
    if (fs.existsSync(imagePath)) {
      throw new Error(translate(nls_ts.screenshot.error.alreadyexists.async));
    }

    fs.writeFileSync(imagePath, clipboardImage);

    // Формируем относительный путь
    let relativePath = path.relative(mdDir, imagePath).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    const markdownLink = `![${userInput}](${relativePath})`;

    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, markdownLink);
    });

    vscode.window.showInformationMessage(translate(nls_ts.screenshot.saved.info, fileName));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(translate(nls_ts.screenshot.error.notsaved, msg));
  }
}

module.exports = { pasteImageFromClipboard };
