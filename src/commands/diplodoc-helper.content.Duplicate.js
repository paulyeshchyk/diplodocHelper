// src/commands/diplodoc-helper.content.Duplicate.js
'use strict';

const vscode = require('vscode');
const path = require('path');
const {
  duplicateLocalAssets,
  rollbackDuplicatedAssets,
  adaptFragmentWithRemap,
} = require('./diplodoc-helper.content.figure.moveAssets');
const {
  isDocumentAlreadyOpen,
  pickTargetMdFile,
  pickInsertMode,
  insertIntoTargetDocument,
} = require('./diplodoc-helper.content.transfer');

/**
 * Скопировать (дублировать) выделенный MD-контент в другой MD-файл:
 * - локальные картинки исходного документа копируются к приёмнику (оригиналы остаются на месте);
 * - ссылки на скопированные картинки ведут на копии у приёмника;
 * - остальные ссылки пересчитываются относительно файла-приёмника.
 */
async function ux_content_duplicate() {
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
    vscode.window.showErrorMessage('Выделите фрагмент текста для дублирования.');
    return;
  }

  const sourcePath = doc.uri.fsPath;
  const rawContent = doc.getText(selection);
  if (!rawContent.trim()) {
    vscode.window.showErrorMessage('Выделение пустое.');
    return;
  }

  // --- выбор целевого файла ---
  const targetPath = await pickTargetMdFile(
    sourcePath,
    'Выберите целевой Markdown-файл для дублирования',
  );
  if (!targetPath) return;

  if (path.resolve(targetPath) === path.resolve(sourcePath)) {
    vscode.window.showWarningMessage('Источник и цель совпадают — операция отменена.');
    return;
  }

  const wasTargetOpen = isDocumentAlreadyOpen(targetPath);
  const insertMode = await pickInsertMode(wasTargetOpen);
  if (!insertMode) return;

  // 1. Копируем локальные картинки (без удаления из источника и без трогания внешних ссылок)
  const dupResult = await duplicateLocalAssets(rawContent, sourcePath, targetPath);

  if (dupResult.warnings.length) {
    vscode.window.showWarningMessage(dupResult.warnings.join('\n'));
  }

  // 2. Адаптируем все ссылки в копируемом блоке:
  //    - скопированные картинки -> на новые копии у приёмника (через pathRemap)
  //    - ссылки на источник / другие документы / чужие картинки -> пересчёт относительно targetPath
  const { content: adapted, adaptedCount } = adaptFragmentWithRemap(
    rawContent,
    sourcePath,
    targetPath,
    dupResult.pathRemap,
  );

  try {
    // 3. Вставляем в целевой документ (исходный документ не изменяем)
    const { ok, targetDoc } = await insertIntoTargetDocument(
      targetPath,
      adapted,
      insertMode,
      wasTargetOpen,
    );

    if (!ok || !targetDoc) {
      await rollbackDuplicatedAssets(dupResult);
      vscode.window.showErrorMessage('Не удалось вставить фрагмент в целевой файл.');
      return;
    }

    if (targetDoc.isDirty) {
      await targetDoc.save();
    }

    const parts = ['Фрагмент продублирован.'];
    if (adaptedCount) parts.push(`Адаптировано ссылок: ${adaptedCount}.`);
    if (dupResult.copied.length) {
      parts.push(`Скопировано изображений: ${dupResult.copied.length}.`);
    }
    vscode.window.showInformationMessage(parts.join(' '));
  } catch (err) {
    try {
      await rollbackDuplicatedAssets(dupResult);
    } catch (rbErr) {
      console.error('[content.duplicate] rollback failed:', rbErr);
    }

    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Ошибка дублирования: ${msg}`);
  }
}

module.exports = { ux_content_duplicate };