// @ts-nocheck
const vscode = require('vscode');
const { nls_ts, translate } = require('../nls_ts.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadTermDictionary } = require('../plugins/terms/terms.dictionary.js');
const { findTermAroundOffset } = require('../plugins/terms/terms.textRange.js');

class TermCodeActionProvider {
    provideCodeActions(document, range, context, token) {
        if (token.isCancellationRequested) return undefined;
        if (document.languageId !== 'markdown') return [];

        const actions = [];
        const termContext = findTermAround(document, range.start);

        if (termContext) {
            const langDir = getLanguageRoot(document.uri.fsPath);
            const dictionary = langDir ? loadTermDictionary(langDir) : new Map();
            const def = dictionary.get(termContext.term);

            if (def) {
                const showFull = new vscode.CodeAction(
                    `${translate(nls_ts.plugin.term.codeAction.showFull)}: ${def.definition}`,
                    vscode.CodeActionKind.Empty
                );
                showFull.command = {
                    command: 'diplodoc-helper.term.showFull',
                    title: translate(nls_ts.plugin.term.codeAction.showFull),
                    arguments: [def.definition],
                };
                actions.push(showFull);
            } else {
                const addToDict = new vscode.CodeAction(
                    translate(nls_ts.plugin.term.codeAction.addToDict, termContext.term),
                    vscode.CodeActionKind.QuickFix
                );
                addToDict.command = {
                    command: 'diplodoc-helper.term.Add',
                    title: translate(nls_ts.plugin.term.codeAction.addToDict, termContext.term),
                    arguments: [{ mode: 'create', termText: termContext.term }],
                };
                actions.push(addToDict);
            }

            const removeMarkup = new vscode.CodeAction(
                translate(nls_ts.plugin.term.codeAction.removeMarkup),
                vscode.CodeActionKind.RefactorRewrite
            );
            removeMarkup.edit = new vscode.WorkspaceEdit();
            removeMarkup.edit.replace(document.uri, termContext.range, termContext.term);
            actions.push(removeMarkup);

            return actions;
        }

        if (!range.isEmpty) {
            const wrap = new vscode.CodeAction(
                translate(nls_ts.plugin.term.codeAction.wrap),
                vscode.CodeActionKind.RefactorRewrite
            );
            wrap.command = {
                command: 'diplodoc-helper.term.Add',
                title: translate(nls_ts.plugin.term.codeAction.wrap),
            };
            actions.push(wrap);
            return actions;
        }

        const wordRange = document.getWordRangeAtPosition(range.start, /[A-Za-zА-Яа-яЁё0-9_.]+/);
        if (wordRange) {
            const wrap = new vscode.CodeAction(
                translate(nls_ts.plugin.term.codeAction.wrapWord),
                vscode.CodeActionKind.RefactorRewrite
            );
            wrap.command = {
                command: 'diplodoc-helper.term.Add',
                title: translate(nls_ts.plugin.term.codeAction.wrapWord),
            };
            actions.push(wrap);
        }

        return actions;
    }
}

function findTermAround(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const found = findTermAroundOffset(text, offset);
    if (!found) return null;
    return {
        range: new vscode.Range(document.positionAt(found.startOffset), document.positionAt(found.endOffset)),
        term: found.term,
    };
}

module.exports = { TermCodeActionProvider, findTermAround };