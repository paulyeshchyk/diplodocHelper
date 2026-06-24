const { translate, nls_ts } = require('../nls_ts');
const { getLanguageRoot, isDiplodocSection } = require('../plugins/utils/path.directory');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} MoveTarget
 * @property {string} path
 * @property {string} label
 * @property {number} level
 */

/** 

 * @typedef {Object} LintFixCandidate
 * @property {string} label
 * @property {string} [description]
 * @property {string} [targetPath]
 * @property {boolean} [isCandidate]
 * @property {vscode.QuickPickItemKind} [kind]
*/

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
 * Выбор целевой папки с учётом кандидатов (для быстрого исправления битых ссылок)
 * @param {string} sourcePath - путь к текущему файлу (для определения корня языка)
 * @param {string[]} candidates - массив абсолютных путей к кандидатам (может быть пустым)
 * @returns {Promise<string | null>} - выбранный абсолютный путь к папке или файлу (если выбран файл, возвращаем путь к нему, но мы будем приводить к папке)
 */
async function selectTargetDirectoryWithCandidates(sourcePath, candidates) {
    const languageRoot = getLanguageRoot(sourcePath);
    const allTargets = await collectMoveTargets(languageRoot); // все папки-разделы

    // Формируем элементы для QuickPick
    /** @type {Array<LintFixCandidate>} */
    let items = [];

    // Если есть кандидаты, добавляем их как отдельную группу "Предполагаемые"
    if (candidates && candidates.length > 0) {
        // Преобразуем кандидаты в элементы
        const candidateItems = candidates.flatMap(filePath => {
            // Находим папку, содержащую index.md (если кандидат – файл)
            let targetDir = filePath;
            if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
                // Если это файл, берём его родительскую папку
                targetDir = path.dirname(filePath);
            }
            // Проверяем, является ли эта папка разделом Diplodoc
            if (isDiplodocSection(targetDir)) {
                // Вычисляем уровень вложенности относительно корня языка
                // const relPath = path.relative(languageRoot, targetDir);
                const level = 0; //relPath.split(path.sep).filter(s => s).length;
                return [
                    {
                        label: '  '.repeat(level) + '⭐ ' + path.basename(targetDir),
                        description: '', //targetDir
                        targetPath: targetDir,
                        isCandidate: true,
                    },
                ];
            }
            return [];
        });

        if (candidateItems.length > 0) {
            // Добавляем разделитель и кандидатов
            items.push({ label: '⭐ Предполагаемые файлы', kind: vscode.QuickPickItemKind.Separator });
            items.push(...candidateItems);
            items.push({ label: '─── Все разделы ───', kind: vscode.QuickPickItemKind.Separator });
        }
    }

    // Добавляем все остальные разделы
    const allItems = allTargets.map(t => ({
        label: '  '.repeat(t.level) + t.label,
        description: '', //t.path
        targetPath: t.path,
        isCandidate: false,
    }));

    items = items.concat(allItems);

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder:
            translate(nls_ts.plugin.section.move.placeholder.targetfolder) +
            (candidates && candidates.length > 0 ? ' (⭐ — предполагаемые)' : ''),
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

module.exports = { selectTargetDirectory, selectTargetDirectoryWithCandidates };
