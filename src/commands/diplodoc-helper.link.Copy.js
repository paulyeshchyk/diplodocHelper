//diplodoc-helper.link.Copy.js

const vscode = require('vscode');
const { translate } = require('../nls_loader');
const { buildClipboardLink } = require('../plugins/shared/builders/link/cliboardLinkBuilder');

/**
 * @param {vscode.Uri} uri
 */
async function ux_link_copy(uri) {
    if (!uri) return;
    var { cl, title } = buildClipboardLink(uri.fsPath);

    await vscode.env.clipboard.writeText(JSON.stringify(cl));
    vscode.window.showInformationMessage(translate('plugin.link.copy.info.success', title));
}

module.exports = { ux_link_copy };
