// src/commands/diplodoc-helper.section.ReindexDirectories.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const { reindexFigures } = require('../plugins/reindexer/reindexer.figures.js');
const { DiplodocConfigFromWorkspace } = require('./vscode.config.manager.js');
const { CONFIG_KEY } = require('../plugins/constants.js');

/**
 * @param {{ fsPath: string }} uri
 */
async function ux_reindex_figures(uri) {
    if (!uri) return;

    const targetDir = uri.fsPath;

    /** @type {ReindexFiguresResult} */
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
            const configObj = DiplodocConfigFromWorkspace(CONFIG_KEY);
            const vscodeLocale = vscode.env.language;
            result = reindexFigures(targetDir, vscodeLocale, configObj);
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

module.exports = { ux_reindex_figures };
