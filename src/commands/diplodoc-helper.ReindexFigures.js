// src/commands/diplodoc-helper.section.ReindexDirectories.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');

const { reindexFigures } = require('../plugins/reindexer/reindexFigures.js');

function getFigurePrefix() {
    const config = vscode.workspace.getConfiguration('diplodoc-helper');
    return config.get('figurePrefix', 'Рисунок');
}

/**
 * @param {{ fsPath: string }} uri
 */
async function reindexFiguresCommand(uri) {
    if (!uri) return;

    const targetDir = uri.fsPath;

    /** @type {import("../plugins/reindexer/reindexFigures.js").ReindexFiguresResult} */
    let result = {
        success: false,
        total: 0,
        reason: 'not started',
    };
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: translate(nls_ts.plugin.section.reindex.progress.text),
            cancellable: false,
        },
        async () => {
            let prefix = getFigurePrefix();
            result = reindexFigures(targetDir, prefix);
        }
    );

    switch (result.success) {
        case true:
            vscode.window.showInformationMessage(
                translate(nls_ts.plugin.reindex.figures.info.successDetailed, result.total)
            );
            break;
        case false:
            vscode.window.showWarningMessage(
                translate(nls_ts.plugin.reindex.figures.info.failDetailed, result.reason || 'unknown')
            );
            break;
    }
}

module.exports = { reindexFiguresCommand };
