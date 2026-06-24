const vscode = require('vscode');

// Вспомогательная функция для замены ссылки (та же, что была)
/**
 * @param {vscode.TextDocument} document
 * @param {vscode.Range} range
 * @param {string} newRelativePath
 */
function replaceLinkInContent(document, range, newRelativePath) {
    const edit = new vscode.WorkspaceEdit();
    const startPos = range.start;
    const content = document.getText();
    const startOffset = document.offsetAt(startPos);
    const rest = content.substring(startOffset);
    const endOffset = rest.indexOf(')');
    if (endOffset === -1) return null;

    const fullLink = rest.substring(0, endOffset + 1);
    const match = fullLink.match(/^\[([^\]]*)\]\(([^)]*)\)/);
    if (!match) return null;

    const newFullLink = `[${match[1]}](${newRelativePath})`;
    const replaceRange = new vscode.Range(startPos, document.positionAt(startOffset + fullLink.length));
    edit.replace(document.uri, replaceRange, newFullLink);
    return edit;
}
exports.replaceLinkInContent = replaceLinkInContent;
