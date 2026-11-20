// src/commands/diplodoc-helper.content.transfer.js
'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { findFiles } = require('./diplodoc-helper.files');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');

/**
 * Проверяет, открыт ли уже файл в каком-либо редакторе/вкладке VS Code.
 * @param {string} filePath
 * @returns {boolean}
 */
function isDocumentAlreadyOpen(filePath) {
  const targetResolved = path.resolve(filePath);

  for (const ed of vscode.window.visibleTextEditors) {
    if (path.resolve(ed.document.uri.fsPath) === targetResolved) {
      return true;
    }
  }

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = /** @type {{ uri?: vscode.Uri } | undefined} */ (tab.input);
      if (input?.uri && path.resolve(input.uri.fsPath) === targetResolved) {
        return true;
      }
    }
  }

  return false;
}

/**
 * QuickPick списка MD-файлов в корне языка (docs/ru и т.п.).
 * @param {string} sourcePath
 * @param {string} [placeHolder]
 */
async function pickTargetMdFile(sourcePath, placeHolder = 'Выберите целевой Markdown-файл') {
  const langRoot = getLanguageRoot(sourcePath);
  const root =
    langRoot && fs.existsSync(langRoot)
      ? langRoot
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!root) {
    vscode.window.showErrorMessage('Не удалось определить корень документации.');
    return null;
  }

  const allMd = await findFiles(root, '.md');
  const sourceResolved = path.resolve(sourcePath);

  const items = allMd
    .filter(p => path.resolve(p) !== sourceResolved)
    .map(p => ({
      label: path.basename(p),
      description: path.relative(root, p).replace(/\\/g, '/'),
      path: p,
    }))
    .sort((a, b) => a.description.localeCompare(b.description, 'ru'));

  if (items.length === 0) {
    vscode.window.showWarningMessage('Других Markdown-файлов не найдено.');
    return null;
  }

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder,
    matchOnDescription: true,
  });

  return picked ? picked.path : null;
}

/**
 * Выбор режима вставки (в конец или в курсор, если файл уже открыт).
 * @param {boolean} wasTargetOpen
 * @returns {Promise<'end' | 'cursor' | null>}
 */
async function pickInsertMode(wasTargetOpen) {
  if (!wasTargetOpen) return 'end';

  const picked = await vscode.window.showQuickPick(
    [
      { label: 'В конец файла', id: /** @type {'end'} */ ('end') },
      { label: 'В позицию курсора открытого файла', id: /** @type {'cursor'} */ ('cursor') },
    ],
    { placeHolder: 'Куда вставить контент?' },
  );

  return picked ? picked.id : null;
}

/**
 * Открывает целевой документ и вставляет в него текст.
 * @param {string} targetPath
 * @param {string} adaptedText
 * @param {'end' | 'cursor'} insertMode
 * @param {boolean} wasTargetOpen
 * @returns {Promise<{ ok: boolean, targetDoc?: vscode.TextDocument }>}
 */
async function insertIntoTargetDocument(targetPath, adaptedText, insertMode, wasTargetOpen) {
  const targetUri = vscode.Uri.file(targetPath);
  const targetDoc = await vscode.workspace.openTextDocument(targetUri);
  const targetEditor = await vscode.window.showTextDocument(targetDoc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside,
  });

  let insertPos;
  let textToInsert;

  if (insertMode === 'cursor' && wasTargetOpen) {
    insertPos = targetEditor.selection.active;
    textToInsert = adaptedText;
  } else {
    const lastLine = targetDoc.lineCount - 1;
    insertPos = new vscode.Position(lastLine, targetDoc.lineAt(lastLine).text.length);

    const targetText = targetDoc.getText();
    const needsLeadingNl =
      targetText.length > 0 &&
      !targetText.endsWith('\n\n') &&
      !adaptedText.startsWith('\n');

    textToInsert = (needsLeadingNl ? '\n\n' : '') + adaptedText;
  }

  const inserted = await targetEditor.edit(eb => {
    eb.insert(insertPos, textToInsert);
  });

  return { ok: inserted, targetDoc };
}

module.exports = {
  isDocumentAlreadyOpen,
  pickTargetMdFile,
  pickInsertMode,
  insertIntoTargetDocument,
};