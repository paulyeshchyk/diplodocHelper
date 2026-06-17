// src/commands/diplodoc-helper.section.Move.js

const { nls_ts, translate } = require('../../nls_ts.js');

('use strict');

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { getSectionMetadata } = require('../plugins/utils/frontmatter.section.metadata.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const {
    TocYamlEntryRemove,
    TocYamlEntryInsertAtPosition,
    TocYamlEntryMoveWithinSameFile,
} = require('../plugins/utils/yaml.toc.entry.js');
const { updateLinksAfterRename } = require('./vscode.linksUpdater.js');

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
async function ux_section_move(uri) {
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
    const success = await performMove(sourcePath, targetDir, position);
    if (success) {
        vscode.window.showInformationMessage(translate(nls_ts.plugin.section.move.info.success, sourceName));
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
 * @returns {Promise<import('../plugins/utils/yaml.toc.entry.js').InsertTocPosition | null>}
 */
async function selectInsertPosition(targetDir, movingSectionName) {
    const items = fs
        .readdirSync(targetDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && isDiplodocSection(path.join(targetDir, e.name)) && e.name !== movingSectionName)
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
 * @param {import('../plugins/utils/yaml.toc.entry.js').InsertTocPosition} position - Принимаем позицию вставки
 */
async function performMove(sourcePath, targetDir, position) {
    const sourceName = path.basename(sourcePath);
    const targetPath = path.join(targetDir, sourceName);

    const oldParentDir = path.dirname(sourcePath);
    const newParentDir = targetDir;

    // Флаг: перемещаем ли мы внутри одной и той же папки?
    const isSameParent = oldParentDir === newParentDir;

    // === КРИТИЧЕСКАЯ ПРОВЕРКА: Защита от перемещения "после самого себя" ===
    if (isSameParent && position.position === 'after' && position.afterName === sourceName) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.section.move.warning.samePosition, sourceName));
        console.log(`[Move] Операция отменена: попытка переместить "${sourceName}" после самого себя.`);
        return false; // Ничего не делаем, выходим
    }
    // === Защита от перемещения внутрь самого себя (в подпапки) ===
    if (!isSameParent && targetPath.startsWith(sourcePath + path.sep)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.recursive));
        return false;
    }

    // Если папка переезжает в ДРУГОЙ раздел, но там уже есть папка с таким именем
    if (!isSameParent && fs.existsSync(targetPath)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.sectionexists, sourceName));
        return false;
    }

    try {
        if (!isSameParent) {
            // СЦЕНАРИЙ 1: Честный переезд в другую директорию

            // 1. Удаляем запись из старого родителя
            TocYamlEntryRemove(oldParentDir, sourceName);

            // 2. Физически перемещаем папку на диске
            fs.renameSync(sourcePath, targetPath);

            // 3. Обновляем ссылки в проекте
            const projectRoot = getLanguageRoot(targetPath);
            await updateLinksAfterRename(sourcePath, targetPath, projectRoot);

            // 4. Получаем заголовок
            const composedTitle = await getComposedTitle(targetPath);

            // 5. Вставляем в новый родитель на выбранное место
            TocYamlEntryInsertAtPosition(newParentDir, composedTitle, sourceName, position);

            console.log(`[Move] Раздел перенесен в другую папку: ${sourceName} -> ${newParentDir}`);
        } else {
            // СЦЕНАРИЙ 2: Перемещение внутри ТЕГО ЖЕ родителя (меняется только позиция в TOC)
            console.log(`[Move] Изменение позиции внутри одного родителя для: ${sourceName}`);

            // Читаем заголовок прямо на месте (никуда ничего не перемещали)
            const composedTitle = await getComposedTitle(sourcePath);

            // Вызываем специальную функцию, которая аккуратно передвинет элемент
            // внутри одного и того же файла toc.yaml, не ломая данные
            TocYamlEntryMoveWithinSameFile(newParentDir, composedTitle, sourceName, position);
        }

        return true;
    } catch (err) {
        let msg = err instanceof Error ? err.message : `${err}`;
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.critical, msg));
        return false;
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

module.exports = { ux_section_move };
