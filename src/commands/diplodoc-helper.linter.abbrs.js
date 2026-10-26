const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { nls_ts, translate } = require('../nls_ts.js');
const { lintAbbrs } = require('../plugins/abbrs/abbrs.linter.js');

/**
 * Определяет docs/ root по URI, на котором вызвали команду.
 * Если URI не задан — берём workspace и ищем docs в нём.
 * @param {vscode.Uri | undefined} uri
 * @returns {string | null}
 */
function resolveDocsRoot(uri) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return null;
    const projectRoot = workspaceFolders[0].uri.fsPath;

    if (uri && uri.fsPath && fs.existsSync(uri.fsPath)) {
        const stat = fs.statSync(uri.fsPath);
        let current = stat.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);

        // Поднимаемся до ближайшей папки docs
        while (current && current !== path.parse(current).root) {
            if (path.basename(current).toLowerCase() === 'docs') return current;
            const parent = path.dirname(current);
            if (parent === current) break;
            current = parent;
        }
    }

    const docsRoot = path.join(projectRoot, 'docs');
    return fs.existsSync(docsRoot) ? docsRoot : null;
}

/**
 * Команда линтера сокращений.
 * @param {vscode.Uri} [uri]
 */
async function ux_linter_abbrs(uri) {
    const docsRoot = resolveDocsRoot(uri);
    if (!docsRoot) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.linter.abbrs.error.noDocsRoot));
        return;
    }

    /** @type {import('../plugins/abbrs/abbrs.linter.js').AbbrLintIssue[]} */
    let issues = [];

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: translate(nls_ts.plugin.linter.abbrs.progress.title),
            cancellable: false,
        },
        async () => {
            issues = lintAbbrs(docsRoot);
        }
    );

    if (issues.length === 0) {
        vscode.window.showInformationMessage(translate(nls_ts.plugin.linter.abbrs.info.clean));
        return;
    }

    const projectRoot = path.dirname(docsRoot);

    /** @type {Array<{ label: string, description: string, filePath: string, line: number, character: number }>} */
    const items = issues.map(issue => ({
        label: `$(warning) ${issue.abbr}`,
        description: `— ${path.relative(projectRoot, issue.filePath)}:${issue.line + 1}`,
        filePath: issue.filePath,
        line: issue.line,
        character: issue.character,
    }));

    const placeHolder = translate(nls_ts.plugin.linter.abbrs.pick.placeholder, issues.length);

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder,
        matchOnDescription: true,
    });

    if (picked) {
        try {
            const doc = await vscode.workspace.openTextDocument(picked.filePath);
            const editor = await vscode.window.showTextDocument(doc);
            const pos = new vscode.Position(picked.line, picked.character);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(translate(nls_ts.plugin.linter.abbrs.error.openFile, msg));
        }
    }
}

module.exports = { ux_linter_abbrs };
