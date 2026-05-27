// src/commands/diplodoc-helper.section.Move.js

const { nls_ts, translate } = require('../../nls_ts.js');

('use strict');

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection, getSectionMetadata } = require('../utils');
const { getLanguageRoot } = require('../utils/directory');
const { reindexDirectory } = require('../core/reindex');
const { TocYamlEntryRemove, TocYamlEntryCreate } = require('../utils');
const { updateLinksAfterRename } = require('../utils/linksUpdater');

/**
 * @typedef {Object} MoveTarget
 * @property {string} path
 * @property {string} label
 * @property {number} level
 */

/**
 * Главная команда перемещения
 * @param {{ fsPath: string }} uri
 */
async function moveSection(uri) {
  if (!uri) return;

  const sourcePath = uri.fsPath;
  if (!isDiplodocSection(sourcePath)) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.incorrectSection));
    return;
  }

  const sourceName = path.basename(sourcePath);

  // 1. Выбор целевой директории
  const targetDir = await selectTargetDirectory(sourcePath);
  if (!targetDir) return;

  // 2. Выбор позиции внутри целевой директории
  const position = await selectInsertPosition(targetDir, sourceName);
  if (!position) return;

  // 3. Выполняем перемещение
  const success = await performMove(sourcePath, targetDir);
  if (success) {
    vscode.window.showInformationMessage(
      translate(nls_ts.plugin.section.move.info.success, sourceName)
    );
  }
}

/**
 * Выбор целевой папки внутри языка (пока ru)
 * @param {string} sourcePath
 */
async function selectTargetDirectory(sourcePath) {
  const languageRoot = getLanguageRoot(sourcePath); // пока ru

  const targets = await collectMoveTargets(languageRoot);

  const items = targets.map(t => ({
    label: '  '.repeat(t.level) + t.label,
    description: t.path,
    targetPath: t.path,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: translate(nls_ts.plugin.section.move.placeholder.targetfolder),
    matchOnDescription: true,
  });

  return selected?.targetPath || null;
}

/**
 * Собирает все возможные целевые папки
 * @param {string} rootDir
 */
async function collectMoveTargets(rootDir) {
  /** @type {MoveTarget[]} */
  const targets = [];

  /**
   * @param {string} dir
   */
  function walk(dir, level = 0) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(dir, entry.name);
      if (isDiplodocSection(fullPath)) {
        targets.push({
          path: fullPath,
          label: entry.name,
          level: level,
        });
      }

      // Рекурсия
      walk(fullPath, level + 1);
    }
  }

  walk(rootDir);
  return targets;
}

/**
 * Выбор позиции вставки
 * @param {string} targetDir
 * @param {string} movingSectionName
 */
async function selectInsertPosition(targetDir, movingSectionName) {
  const items = fs
    .readdirSync(targetDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && isDiplodocSection(path.join(targetDir, e.name)))
    .map(e => ({
      label: translate(nls_ts.plugin.section.move.label.after, e.name),
      description: '',
      position: 'after',
      afterName: e.name,
    }));

  const options = [
    {
      label: translate(nls_ts.plugin.section.move.placeholder.start),
      position: 'start',
    },
    ...items,
    {
      label: translate(nls_ts.plugin.section.move.placeholder.end),
      position: 'end',
    },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: translate(nls_ts.plugin.section.move.placeholder.target, movingSectionName),
  });

  return selected || null;
}

/**
 * Выполняет перемещение раздела
 * @param {string} sourcePath
 * @param {string} targetDir
 */
async function performMove(sourcePath, targetDir) {
  const sourceName = path.basename(sourcePath);
  const targetPath = path.join(targetDir, sourceName);

  // === Защита от перемещения в самого себя или своего потомка ===
  if (sourcePath === targetPath) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.self));
    return false;
  }

  if (targetPath.startsWith(sourcePath + path.sep)) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.recursive));
    return false;
  }

  if (fs.existsSync(targetPath)) {
    vscode.window.showErrorMessage(
      translate(nls_ts.plugin.section.move.error.sectionexists, sourceName)
    );
    return false;
  }

  try {
    const oldParentDir = path.dirname(sourcePath);
    const newParentDir = targetDir;

    // 1. Удаляем запись из старого родителя
    TocYamlEntryRemove(oldParentDir, sourceName);

    // 2. Перемещаем папку
    fs.renameSync(sourcePath, targetPath);

    // 3. Обновляем ссылки на перемещённый раздел и его содержимое
    const projectRoot = getLanguageRoot(targetPath);
    const updatedFiles = await updateLinksAfterRename(sourcePath, targetPath, projectRoot);
    if (updatedFiles > 0) {
      vscode.window.showInformationMessage(
        translate(nls_ts.plugin.section.move.info.success, updatedFiles)
      );
      vscode.window.showWarningMessage(translate(nls_ts.plugin.section.move.warning.broken));
    }

    // 4. Добавляем запись в новый родитель
    const composedTitle = await getComposedTitle(targetPath);

    // Получаем метаданные для корректного добавления
    const sectionInfo = await getSectionInfo(targetPath);

    TocYamlEntryCreate(
      newParentDir,
      composedTitle,
      sourceName,
      sectionInfo.sectionType || 'Page',
      sectionInfo.sectionIndex || ''
    );

    console.log(`Перемещён: ${sourceName} - ${newParentDir}`);

    // 4. Переиндексация обоих родителей
    reindexDirectory(oldParentDir);
    reindexDirectory(newParentDir);

    return true;
  } catch (err) {
    let msg = err instanceof Error ? err.message : `${err}`;
    vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.critical, msg));
    console.error(err);
    return false;
  }
}

/**
 * Читает основные метаданные раздела
 * @param {string} sectionPath
 */
async function getSectionInfo(sectionPath) {
  const indexPath = path.join(sectionPath, 'index.md');
  if (!fs.existsSync(indexPath)) {
    return { sectionType: 'Page', sectionIndex: '' };
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    const metadata = getSectionMetadata(content); // из utils

    return {
      sectionType: metadata.sectionType || 'Page',
      sectionIndex: metadata.sectionIndex || '',
    };
  } catch {
    return { sectionType: 'Page', sectionIndex: '' };
  }
}

/**
 * Читает composed title из index.md перемещённого раздела
 * @param {string} sectionPath
 */
async function getComposedTitle(sectionPath) {
  const indexPath = path.join(sectionPath, 'index.md');
  if (!fs.existsSync(indexPath)) return path.basename(sectionPath);

  const content = fs.readFileSync(indexPath, 'utf8');
  const titleMatch = content.match(/title:\s*(.+)/);
  return titleMatch ? titleMatch[1].trim() : path.basename(sectionPath);
}

module.exports = { moveSection };
