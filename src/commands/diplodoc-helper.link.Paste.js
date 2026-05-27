//diplodoc-helper.link.Paste.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;

/**
 * Вычисляет относительный путь с кодированием
 * @param {string} fromPath – путь к исходному файлу (директория, относительно которой строим путь)
 * @param {string} toPath – целевой путь (файл или папка)
 * @param {boolean} addIndex – нужно ли добавить index.md (для ссылок на папки)
 */
function calculateRelativeMdPath(fromPath, toPath, addIndex) {
  let targetFile = toPath;

  if (addIndex) {
    if (!targetFile.endsWith('.md')) {
      targetFile = path.join(targetFile, 'index.md');
    }
  }

  let relPath = path.relative(path.dirname(fromPath), targetFile);
  relPath = relPath.split(path.sep).join('/');

  const encodedPath = relPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return encodedPath.startsWith('.') ? encodedPath : './' + encodedPath;
}

async function pasteLink() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  try {
    const clipboardText = await vscode.env.clipboard.readText();
    const documentUriPath = editor.document.uri.fsPath;
    const linkText = await ReadLinkText(clipboardText, documentUriPath);

    editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, linkText);
    });
  } catch {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.link.paste.error.critical));
  }
}

/**
 * @param {string} clipboardText
 * @param {string} sourceFilePath
 */
async function ReadLinkText(clipboardText, sourceFilePath) {
  const data = JSON.parse(clipboardText);

  if (!data.sourceLinkPath || !data.sourceLinkName) {
    throw new Error(translate('plugin.link.paste.error.emptybuffer'));
  }

  const targetFilePath = data.sourceLinkPath;

  let { isDirectory } = await BuildFiletypeInfo(targetFilePath);

  let { addIndex, prefix } = BuildCalculationRequest(targetFilePath, isDirectory);

  const mdPath = calculateRelativeMdPath(sourceFilePath, targetFilePath, addIndex);
  return `${prefix}[${data.sourceLinkName}](${mdPath})`;
}

/**
 * @param {string} targetFilePath
 */
async function BuildFiletypeInfo(targetFilePath) {
  let isDirectory = false;

  try {
    const stat = await fs.stat(targetFilePath);
    isDirectory = stat.isDirectory();
  } catch {
    const ext = path.extname(targetFilePath);
    if (!ext) {
      isDirectory = true; // нет расширения — считаем папкой
    }
  }
  return { isDirectory };
}

/**
 * @param {string} targetFilePath
 * @param {boolean} isDirectory
 */
function BuildCalculationRequest(targetFilePath, isDirectory) {
  if (isDirectory) {
    return { addIndex: true, prefix: '' };
  }
  if (targetFilePath.endsWith('.md')) {
    return { addIndex: false, prefix: '' };
  }
  return { addIndex: false, prefix: '!' };
}
module.exports = { pasteLink };
