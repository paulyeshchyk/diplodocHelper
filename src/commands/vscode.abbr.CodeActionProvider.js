const vscode = require('vscode');
const { nls_ts, translate } = require('../nls_ts.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadAbbrDictionary } = require('../plugins/abbrs/abbrs.dictionary.js');
const { findAbbrAroundOffset } = require('../plugins/abbrs/abbrs.textRange.js');

class AbbrCodeActionProvider {
    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.Range} range
     * @param {vscode.CodeActionContext} context
     * @param {vscode.CancellationToken} token
     * @returns {vscode.CodeAction[] | undefined}
     */
    provideCodeActions(document, range, context, token) {
        if (token.isCancellationRequested) return undefined;
        if (document.languageId !== 'markdown') return [];

        const actions = [];
        const abbrContext = findAbbrAround(document, range.start);

        if (abbrContext) {
            const langDir = getLanguageRoot(document.uri.fsPath);
            const dictionary = langDir ? loadAbbrDictionary(langDir) : new Map();
            const def = dictionary.get(abbrContext.abbr);

            if (def) {
                const showFull = new vscode.CodeAction(
                    `${translate(nls_ts.plugin.abbr.codeAction.showFull)}: ${def.full}`,
                    vscode.CodeActionKind.Empty
                );
                showFull.command = {
                    command: 'diplodoc-helper.abbr.showFull',
                    title: translate(nls_ts.plugin.abbr.codeAction.showFull),
                    arguments: [def.full],
                };
                actions.push(showFull);
            } else {
                const addToDict = new vscode.CodeAction(
                    translate(nls_ts.plugin.abbr.codeAction.addToDict, abbrContext.abbr),
                    vscode.CodeActionKind.QuickFix
                );
                addToDict.command = {
                    command: 'diplodoc-helper.abbr.Add',
                    title: translate(nls_ts.plugin.abbr.codeAction.addToDict, abbrContext.abbr),
                    arguments: [{ mode: 'create', abbrText: abbrContext.abbr }],
                };
                actions.push(addToDict);
            }

            const removeMarkup = new vscode.CodeAction(
                translate(nls_ts.plugin.abbr.codeAction.removeMarkup),
                vscode.CodeActionKind.RefactorRewrite
            );
            removeMarkup.edit = new vscode.WorkspaceEdit();
            removeMarkup.edit.replace(document.uri, abbrContext.range, abbrContext.abbr);
            actions.push(removeMarkup);

            return actions;
        }

        if (!range.isEmpty) {
            const wrap = new vscode.CodeAction(
                translate(nls_ts.plugin.abbr.codeAction.wrap),
                vscode.CodeActionKind.RefactorRewrite
            );
            wrap.command = {
                command: 'diplodoc-helper.abbr.Add',
                title: translate(nls_ts.plugin.abbr.codeAction.wrap),
            };
            actions.push(wrap);
            return actions;
        }

        const wordRange = document.getWordRangeAtPosition(range.start, /[A-Za-zА-Яа-яЁё0-9_.]+/);
        if (wordRange) {
            const wrap = new vscode.CodeAction(
                translate(nls_ts.plugin.abbr.codeAction.wrapWord),
                vscode.CodeActionKind.RefactorRewrite
            );
            wrap.command = {
                command: 'diplodoc-helper.abbr.Add',
                title: translate(nls_ts.plugin.abbr.codeAction.wrapWord),
            };
            actions.push(wrap);
        }

        return actions;
    }
}

/**
 * vscode-обёртка над findAbbrAroundOffset.
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @returns {{ range: vscode.Range, abbr: string } | null}
 */
function findAbbrAround(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const found = findAbbrAroundOffset(text, offset);
    if (!found) return null;
    return {
        range: new vscode.Range(document.positionAt(found.startOffset), document.positionAt(found.endOffset)),
        abbr: found.abbr,
    };
}

module.exports = { AbbrCodeActionProvider, findAbbrAround };
