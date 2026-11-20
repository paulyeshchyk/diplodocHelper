// src/commands/diplodoc-helper.content.Move.js
'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { findFiles } = require('./diplodoc-helper.files');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const {
  commitMovedAssets,
  rollbackMovedAssets,
  moveFigureAssets,
  adaptFragmentWithRemap,
  computeInDocumentRemapEdits,
} = require('./diplodoc-helper.content.figure.moveAssets');
const {
  validateFigureIntegrity,
  getFiguresFullyInside,
} = require('./diplodoc-helper.content.figure.validate.js');

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
 * Вырезать выделенный MD-контент и вставить в другой MD-файл
 * с пересчётом относительных ссылок и переносом локальных <figure>-ассетов.
 */
async function ux_content_move() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Нет активного редактора.');
    return;
  }

  const doc = editor.document;
  if (doc.languageId !== 'markdown') {
    vscode.window.showErrorMessage('Команда работает только в Markdown-файлах.');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showErrorMessage('Выделите фрагмент текста для переноса.');
    return;
  }

  const sourcePath = doc.uri.fsPath;
  const rawContent = doc.getText(selection);
  if (!rawContent.trim()) {
    vscode.window.showErrorMessage('Выделение пустое.');
    return;
  }

  const fullText = doc.getText();
  const selStart = doc.offsetAt(selection.start);
  const selEnd = doc.offsetAt(selection.end);

  const integrity = validateFigureIntegrity(fullText, selStart, selEnd);
  if (!integrity.ok) {
    vscode.window.showErrorMessage(integrity.reason);
    return;
  }

  // --- выбор целевого файла ---
  const targetPath = await pickTargetMdFile(sourcePath);
  if (!targetPath) return;

  if (path.resolve(targetPath) === path.resolve(sourcePath)) {
    vscode.window.showWarningMessage('Источник и цель совпадают — операция отменена.');
    return;
  }

  const wasTargetOpen = isDocumentAlreadyOpen(targetPath);

  // --- куда вставлять ---
  /** @type {{ label: string, id: 'end' | 'cursor' } | undefined} */
  let insertMode = { label: 'В конец файла', id: 'end' };
  if (wasTargetOpen) {
    insertMode = await vscode.window.showQuickPick(
      [
        { label: 'В конец файла', id: 'end' },
        { label: 'В позицию курсора открытого файла', id: 'cursor' },
      ],
      { placeHolder: 'Куда вставить контент?' },
    );
    if (!insertMode) return;
  }

  // Только картинки из полных <figure> внутри выделения
  const figures = getFiguresFullyInside(fullText, selStart, selEnd);
  const figureBodies = figures.map(f => f.body).join('\n');

  // copy + rewrite внешних refs; sourcePath не перезаписывается на диске
  const assetResult = await moveFigureAssets(figureBodies, sourcePath, targetPath, {
    mode: 'copy',
  });

  if (assetResult.warnings.length) {
    vscode.window.showWarningMessage(assetResult.warnings.join('\n'));
  }

  // Адаптация ссылок в переносимом фрагменте с учётом remap картинок
  const { content: adapted, adaptedCount } = adaptFragmentWithRemap(
    rawContent,
    sourcePath,
    targetPath,
    assetResult.pathRemap,
  );

  // Вычисляем правки для оставшихся ссылок на перенесённые картинки внутри самого sourceDoc
  const sourceRemainingEdits = computeInDocumentRemapEdits(
    fullText,
    sourcePath,
    assetResult.pathRemap,
    selStart,
    selEnd,
  );

  // Снимок исходного документа в памяти для гарантированного отката
  const sourceBeforeEdit = fullText;

  try {
    // 1. Атомарно удаляем выделение И обновляем оставшиеся ссылки в sourceDoc через editor.edit
    const sourceEdited = await editor.edit(eb => {
      eb.delete(selection);
      for (const item of sourceRemainingEdits) {
        const range = new vscode.Range(
          doc.positionAt(item.start),
          doc.positionAt(item.end),
        );
        eb.replace(range, item.replacement);
      }
    });

    if (!sourceEdited) {
      await rollbackMovedAssets(assetResult);
      vscode.window.showErrorMessage('Не удалось обновить исходный файл.');
      return;
    }

    // 2. Открываем цель и вставляем адаптированный фрагмент
    const targetUri = vscode.Uri.file(targetPath);
    const targetDoc = await vscode.workspace.openTextDocument(targetUri);
    const targetEditor = await vscode.window.showTextDocument(targetDoc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });

    let insertPos;
    let textToInsert;

    if (insertMode.id === 'cursor' && wasTargetOpen) {
      insertPos = targetEditor.selection.active;
      textToInsert = adapted;
    } else {
      const lastLine = targetDoc.lineCount - 1;
      insertPos = new vscode.Position(lastLine, targetDoc.lineAt(lastLine).text.length);

      const targetText = targetDoc.getText();
      const needsLeadingNl =
        targetText.length > 0 &&
        !targetText.endsWith('\n\n') &&
        !adapted.startsWith('\n');

      textToInsert = (needsLeadingNl ? '\n\n' : '') + adapted;
    }

    const inserted = await targetEditor.edit(eb => {
      eb.insert(insertPos, textToInsert);
    });

    if (!inserted) {
      await rollbackMovedAssets(assetResult);
      const fullRange = new vscode.Range(
        doc.positionAt(0),
        doc.positionAt(doc.getText().length),
      );
      await editor.edit(eb => {
        eb.replace(fullRange, sourceBeforeEdit);
      });
      vscode.window.showErrorMessage('Не удалось вставить в целевой файл. Контент возвращён.');
      return;
    }

    // Текст на месте → фиксируем перенос файлов (удаляем исходники и пустые подпапки)
    await commitMovedAssets(assetResult);

    // Сохраняем оба документа
    if (doc.isDirty) await doc.save();
    if (targetDoc.isDirty) await targetDoc.save();

    const totalUpdatedDocs =
      assetResult.updatedRefFiles.length + (sourceRemainingEdits.length > 0 ? 1 : 0);

    const parts = ['Фрагмент перенесён.'];
    if (adaptedCount) parts.push(`Ссылок в тексте: ${adaptedCount}.`);
    if (assetResult.moved.length) {
      parts.push(`Файлов изображений: ${assetResult.moved.length}.`);
    }
    if (totalUpdatedDocs) {
      parts.push(`Обновлено документов со ссылками: ${totalUpdatedDocs}.`);
    }
    vscode.window.showInformationMessage(parts.join(' '));
  } catch (err) {
    try {
      await rollbackMovedAssets(assetResult);
      if (doc.getText() !== sourceBeforeEdit) {
        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(doc.getText().length),
        );
        await editor.edit(eb => {
          eb.replace(fullRange, sourceBeforeEdit);
        });
      }
    } catch (rbErr) {
      console.error('[content.move] rollback failed:', rbErr);
    }

    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Ошибка переноса: ${msg}`);
  }
}

/**
 * QuickPick списка MD-файлов в корне языка (docs/ru и т.п.).
 * @param {string} sourcePath
 */
async function pickTargetMdFile(sourcePath) {
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
    placeHolder: 'Выберите целевой Markdown-файл',
    matchOnDescription: true,
  });

  return picked ? picked.path : null;
}

module.exports = { ux_content_move };