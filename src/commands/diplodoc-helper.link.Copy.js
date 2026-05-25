//diplodoc-helper.link.Copy.js

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { IndexMdFileRead } = require('../utils');
const { translate } = require('../../nls_loader');

/**
 * @param {vscode.Uri} uri
 */
async function copyLink(uri) {
  if (!uri) return;

  const fsPath = uri.fsPath;
  const stats = fs.statSync(fsPath);

  let title = '';
  let targetPath = fsPath;

  if (stats.isDirectory()) {
    // Логика для раздела (папки)
    const section = IndexMdFileRead(fsPath);
    title = section?.pureTitle || path.basename(fsPath);
  } else {
    // Логика для файла (картинки, документы)
    title = path.basename(fsPath);
  }

  const data = {
    sourceLinkName: title,
    sourceLinkPath: targetPath,
    isImage: /\.(png|jpe?g|gif|svg|webp)$/i.test(fsPath), // Пометка, если это картинка
  };

  await vscode.env.clipboard.writeText(JSON.stringify(data));
  vscode.window.showInformationMessage(translate('plugin.link.copy.info.success', title));
}

module.exports = { copyLink };
