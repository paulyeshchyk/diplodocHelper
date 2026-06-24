const vscode = require('vscode');
const { findCandidateFiles } = require('./vscode.linter.links.findCandidateFiles');
const { getLinterCachedMdFiles, getLinterCachedRootDir } = require('./diplodoc-helper.linter.links');

/**
 * CodeActionProvider для битых ссылок
 */
class BrokenLinkCodeActionProvider {
    /**
     * Предоставляет быстрые исправления для битых ссылок
     * @param {vscode.TextDocument} document - текущий документ
     * @param {vscode.Range} range - диапазон, в котором запрошены действия
     * @param {vscode.CodeActionContext} context - контекст (содержит диагностики)
     * @param {vscode.CancellationToken} token - токен отмены
     * @returns {vscode.CodeAction[] | undefined}
     */
    provideCodeActions(document, range, context, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const diagnostics = context.diagnostics.filter(
            d => d.source === 'link-linter' && d.severity === vscode.DiagnosticSeverity.Error
        );
        if (diagnostics.length === 0) return [];

        const actions = [];
        const cachedMdFiles = getLinterCachedMdFiles();
        const rootDir = getLinterCachedRootDir();

        for (const diagnostic of diagnostics) {
            const match = diagnostic.message.match(/^Битая ссылка:\s*(.*)$/);
            if (!match) continue;
            const brokenLink = match[1].trim();

            const candidates = findCandidateFiles(brokenLink, document.uri.fsPath, cachedMdFiles, rootDir);

            // Если есть кандидаты, предлагаем два варианта: с кандидатами и все файлы
            if (candidates.length > 0) {
                // Вариант 1: Использовать кандидатов
                const actionCandidates = new vscode.CodeAction(
                    'Заменить на предполагаемый файл (⭐)',
                    vscode.CodeActionKind.QuickFix
                );
                actionCandidates.diagnostics = [diagnostic];
                actionCandidates.command = {
                    command: 'ux-linter.pickAndReplace',
                    title: 'Выбрать файл и якорь',
                    arguments: [document, diagnostic, candidates],
                };
                actions.push(actionCandidates);

                // Вариант 2: Выбрать из всех файлов (передаём пустой массив)
                const actionAll = new vscode.CodeAction('Выбрать из всех файлов...', vscode.CodeActionKind.QuickFix);
                actionAll.diagnostics = [diagnostic];
                actionAll.command = {
                    command: 'ux-linter.pickAndReplace',
                    title: 'Выбрать файл и якорь',
                    arguments: [document, diagnostic, []], // пустой массив – покажет все
                };
                actions.push(actionAll);
            } else {
                // Нет кандидатов – только "Найти файл"
                const action = new vscode.CodeAction('Найти файл для замены...', vscode.CodeActionKind.QuickFix);
                action.diagnostics = [diagnostic];
                action.command = {
                    command: 'ux-linter.pickAndReplace',
                    title: 'Выбрать файл и якорь',
                    arguments: [document, diagnostic, []],
                };
                actions.push(action);
            }
        }
        return actions;
    }
}

module.exports = { BrokenLinkCodeActionProvider };
