// src/commands/diplodoc-helper.linter.links.js

const vscode = require('vscode');
const { lintInternalLinks } = require('../plugins/linter/linter.links.js');
const path = require('path');
const fs = require('fs');

/**
 * @type {string[]}
 */
let cachedMdFiles = [];
let cachedRootDir = '';

/**
 *
 * @returns {Array<string>}
 */
function getLinterCachedMdFiles() {
    return cachedMdFiles;
}
function getLinterCachedRootDir() {
    return cachedRootDir;
}
// Команда линтера (обновлённая)
/**
 * Команда для запуска линтера из контекстного меню
 * @param {vscode.Uri} uri - URI папки или файла, на котором вызвано меню
 */
async function ux_linter_links(uri) {
    let rootDir;
    if (uri && uri.fsPath) {
        const stats = fs.statSync(uri.fsPath);
        if (stats.isDirectory()) {
            rootDir = uri.fsPath;
        } else {
            rootDir = path.dirname(uri.fsPath);
        }
    } else {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Не удалось определить корень проекта.');
            return;
        }
        rootDir = workspaceFolders[0].uri.fsPath;
    }

    const result = lintInternalLinks(rootDir);

    if (!result.success) {
        vscode.window.showErrorMessage(`Ошибка линтера: ${result.reason}`);
        return;
    }

    // Сохраняем кэш для быстрых исправлений
    cachedMdFiles = result.allMdFiles || [];
    cachedRootDir = rootDir;

    // Формируем диагностики (как ранее)
    const diagnosticCollection = getDiagnosticCollection();
    diagnosticCollection.clear();

    const errorsByFile = new Map();
    for (const err of result.errors) {
        if (!errorsByFile.has(err.filePath)) {
            errorsByFile.set(err.filePath, []);
        }
        errorsByFile.get(err.filePath).push(err);
    }

    for (const [filePath, errors] of errorsByFile) {
        const uriFile = vscode.Uri.file(filePath);
        const diagnostics = errors.map(
            (/** @type {{ linkUrl: string; line: number; character: number; severity: string; }} */ err) => {
                let displayLink;
                try {
                    displayLink = decodeURIComponent(err.linkUrl);
                } catch {
                    displayLink = err.linkUrl;
                }
                const range = new vscode.Range(
                    new vscode.Position(err.line, err.character),
                    new vscode.Position(err.line, err.character + 1)
                );
                const severity =
                    err.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
                const message =
                    err.severity === 'error' ? `Битая ссылка: ${displayLink}` : `Невалидный якорь: ${displayLink}`;
                const diagnostic = new vscode.Diagnostic(range, message, severity);
                diagnostic.source = 'link-linter';
                return diagnostic;
            }
        );
        diagnosticCollection.set(uriFile, diagnostics);
    }

    if (result.totalErrors === 0 && result.totalWarnings === 0) {
        vscode.window.showInformationMessage('✅ Все ссылки и якоря валидны.');
    } else {
        let msg = `❌ Найдено ошибок: ${result.totalErrors}, предупреждений: ${result.totalWarnings}.`;
        vscode.window.showWarningMessage(msg);
        vscode.commands.executeCommand('workbench.action.problems.focus');
    }
}

/** @type {vscode.DiagnosticCollection | null} */
let diagnosticCollection = null;
function getDiagnosticCollection() {
    if (!diagnosticCollection) {
        diagnosticCollection = vscode.languages.createDiagnosticCollection('brokenLinks');
    }
    return diagnosticCollection;
}

module.exports = { ux_linter_links, getLinterCachedMdFiles, getLinterCachedRootDir };
