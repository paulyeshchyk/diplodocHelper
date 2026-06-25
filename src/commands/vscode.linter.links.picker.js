const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const {
    extractAnchorsFromMdFile,
    promptAnchorSelection,
    calculateRelativeMdPath,
} = require('../plugins/utils/link.utils.js');

const { replaceLinkInContent } = require('./vscode.linter.links.replaceLinkInContent.js');
const { selectTargetDirectoryWithCandidates } = require('./vscode.quickpick.mdhierarchy.js');

/**
 * Команда для выбора кандидата через QuickPick + выбор якоря
 * @param {vscode.TextDocument} document
 * @param {{ range: vscode.Range; }} diagnostic
 * @param {string[]} candidates - массив абсолютных путей к кандидатам (может быть пустым)
 */
async function pickAndReplace(document, diagnostic, candidates) {
    // Используем новый метод с поддержкой кандидатов
    let selectedTargetDirectory = await selectTargetDirectoryWithCandidates(document.uri.fsPath, candidates);

    if (!selectedTargetDirectory) return;

    let targetFile = selectedTargetDirectory;

    if (fs.statSync(selectedTargetDirectory).isDirectory()) {
        targetFile = path.join(targetFile, 'index.md');
        if (!fs.existsSync(targetFile)) {
            vscode.window.showErrorMessage('В выбранной папке нет index.md');
            return;
        }
    }

    // Извлекаем якоря
    const anchors = await extractAnchorsFromMdFile(targetFile);
    let selectedAnchor = await getSelectedAnchor(anchors);
    if (selectedAnchor === undefined) return;

    // Строим относительный путь
    const addIndex = targetFile.endsWith('index.md');
    let relPath = calculateRelativeMdPath(document.uri.fsPath, targetFile, addIndex);

    if (selectedAnchor) {
        relPath += `#${selectedAnchor}`;
    }

    // Заменяем ссылку
    const edit = replaceLinkInContent(document, diagnostic.range, relPath);
    if (edit) {
        await vscode.workspace.applyEdit(edit);
    }
}

/**
 * @param {{label:string, anchor:string}[]} anchors
 */
async function getSelectedAnchor(anchors) {
    if (anchors.length > 0) {
        const translateFn = (/** @type {string | number} */ key) => {
            /** @type {Record<string, string>} */
            const fallbacks = {
                'plugin.link.paste.anchor.quickPick.label': 'Ввести вручную',
                'plugin.link.paste.anchor.quickPick.description': '...',
                'plugin.link.paste.anchor.select': 'Выберите якорь (или введите свой)',
                'plugin.link.paste.anchor.input.prompt': 'Введите якорь',
                'plugin.link.paste.anchor.input.placeHolder': 'my-anchor',
                'plugin.link.paste.anchor.input.validate.error.emptyAnchor': 'Якорь не может быть пустым',
                'plugin.link.paste.anchor.input.validate.error.incorrectCharacters':
                    'Якорь не должен содержать пробелов',
            };
            return fallbacks[key] || key;
        };
        return await promptAnchorSelection(anchors, translateFn);
    } else {
        const customAnchor = await vscode.window.showInputBox({
            prompt: 'Введите якорь (или оставьте пустым)',
            placeHolder: 'my-anchor',
        });
        if (customAnchor === undefined) return;
        return customAnchor.trim() || null;
    }
}

module.exports = { pickAndReplace };
