// src/commands/diplodoc-helper.footnote.Reindex.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const { reindexFootnotes } = require('../plugins/reindexer/reindexer.footnotes.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');

/**
 * Пересчитывает сноски во всех .md-файлах выбранной папки/языка.
 * @param {{ fsPath: string }} uri
 */
async function ux_reindex_footnotes(uri) {
    if (!uri) return;

    // Определяем корень языка (docs/ru, docs/en) — как в reindex_figures
    const targetDir = getLanguageRoot(uri.fsPath);

    /** @type {{success: boolean, total: number, changed: number, reason?: string}} */
    let result = { success: false, total: 0, changed: 0, reason: 'not_started' };

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: translate(nls_ts.plugin.section.reindex.progress.text),
            cancellable: false,
        },
        async () => {
            result = reindexFootnotes(targetDir);
        }
    );

    if (result.success) {
        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.reindex.footnotes.info.successDetailed, result.total, result.changed)
        );
    } else {
        vscode.window.showWarningMessage(
            translate(nls_ts.plugin.reindex.footnotes.info.failDetailed, result.reason || 'unknown')
        );
    }
}

module.exports = { ux_reindex_footnotes };
