// @ts-nocheck
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { nls_ts, translate } = require('../nls_ts.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadTermDictionary } = require('../plugins/terms/terms.dictionary.js');
const { appendTermToDictionary } = require('../plugins/terms/terms.dictionary.writer.js');
const { findTermAroundOffset } = require('../plugins/terms/terms.textRange.js');
const { runGeneration } = require('../plugins/terms/terms');
const { inferLang } = require('../plugins/terms/terms.paths.js');

function escapeHtmlText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Оборачивает диапазон в <abbr class="term">.
 *
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} range — что заменяем
 * @param {string} visibleText — что показываем в тексте
 * @param {string} [lookupTerm] — канонический термин из словаря.
 *   Если задан и отличается от visibleText — добавляется data-term="…".
 */
async function wrapInTerm(editor, range, visibleText, lookupTerm) {
    const visible = String(visibleText || '').trim();
    if (!visible) return;

    const lookup = String(lookupTerm || '').trim();
    const needsDataTerm = lookup && lookup !== visible;

    let attrs = 'class="term"';
    if (needsDataTerm) {
        attrs += ` data-term="${escapeHtmlAttr(lookup)}"`;
    }
    const finalText = `<abbr ${attrs}>${escapeHtmlText(visible)}</abbr>`;

    const currentText = editor.document.getText(range).trim();
    if (currentText === finalText) return;

    await editor.edit(eb => eb.replace(range, finalText));
}

async function createTermAndInsert(editor, targetRange, targetVisible, targetTerm, langDir) {
    const dictionary = loadTermDictionary(langDir);

    if (dictionary.has(targetTerm)) {
        await wrapInTerm(editor, targetRange, targetVisible, targetTerm);
        await saveAndRegenerate(editor, langDir, targetTerm, false);
        return;
    }

    const definition = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.term.add.definition.prompt, targetTerm),
        placeHolder: translate(nls_ts.plugin.term.add.definition.placeholder),
        validateInput: v =>
            !v || v.trim().length === 0 ? translate(nls_ts.plugin.term.add.definition.error.empty) : null,
    });
    if (!definition) return;

    const category = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.term.add.category.prompt),
        placeHolder: translate(nls_ts.plugin.term.add.category.placeholder),
    });

    const added = appendTermToDictionary(
        langDir,
        {
            term: targetTerm,
            definition: definition.trim(),
            category: category && category.trim() ? category.trim() : undefined,
        },
        inferLang(langDir)
    );

    if (!added) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.term.add.warning.alreadyInDictionary, targetTerm));
        return;
    }

    await wrapInTerm(editor, targetRange, targetVisible, targetTerm);
    await saveAndRegenerate(editor, langDir, targetTerm, true);
}

function getTermWordRange(document, position) {
    return document.getWordRangeAtPosition(position, /[A-Za-zА-Яа-яЁё0-9_.]+/);
}

async function unwrapTerm(editor, range) {
    const currentText = editor.document.getText(range);
    const match = currentText.match(
        /^<abbr\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*>([\s\S]*?)<\/abbr>$/i
    );
    if (!match) return;
    await editor.edit(eb => eb.replace(range, match[1]));
}

async function saveAndRegenerate(editor, langDir, termText, wasCreated) {
    const document = editor.document;

    if (document.isDirty) {
        const saved = await document.save();
        if (!saved) {
            vscode.window.showWarningMessage(translate(nls_ts.plugin.term.add.warning.saveFailed, termText));
            return;
        }
    }

    const docsRoot = path.dirname(langDir);

    try {
        const results = runGeneration(docsRoot);
        if (results.failed.length > 0) {
            vscode.window.showWarningMessage(
                translate(nls_ts.plugin.term.add.warning.indexFailed, termText, results.failed.join(', '))
            );
            return;
        }

        const msg = wasCreated
            ? translate(nls_ts.plugin.term.add.info.dictUpdatedAndIndex, termText)
            : translate(nls_ts.plugin.term.add.info.usedAndIndex, termText);
        vscode.window.showInformationMessage(msg);
    } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(translate(nls_ts.plugin.term.add.warning.indexFailed, termText, m));
    }
}

async function ux_term_add(argument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.noEditor));
        return;
    }

    const document = editor.document;
    if (document.languageId !== 'markdown') {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.notMarkdown));
        return;
    }

    const selection = editor.selection;
    let targetRange;
    let targetTerm; // канонический термин (lookup key)
    let targetVisible; // видимый текст (что окажется внутри <abbr>)
    let alreadyWrapped = false;

    const text = document.getText();
    const offset = document.offsetAt(selection.active);
    const ctx = findTermAroundOffset(text, offset);

    if (ctx) {
        targetRange = new vscode.Range(document.positionAt(ctx.startOffset), document.positionAt(ctx.endOffset));
        targetTerm = ctx.term;
        targetVisible = ctx.visibleText;
        alreadyWrapped = true;
    } else if (!selection.isEmpty) {
        targetRange = selection;
        const raw = document.getText(targetRange).trim();
        const m = raw.match(/^<abbr\b([^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([\s\S]*?)<\/abbr>$/i);
        if (m) {
            const attrs = m[1];
            const innerText = m[2].trim();
            const dt = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const dataTerm = dt ? ((dt[1] !== undefined ? dt[1] : dt[2]) || '').trim() : '';
            targetVisible = innerText;
            targetTerm = dataTerm || innerText;
            alreadyWrapped = true;
        } else {
            targetVisible = raw;
            targetTerm = raw;
        }
    } else {
        const wordRange = getTermWordRange(document, selection.active);
        if (!wordRange) {
            vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.noSelection));
            return;
        }
        targetRange = wordRange;
        targetVisible = document.getText(targetRange).trim();
        targetTerm = targetVisible;
    }

    if (!targetTerm || !targetVisible) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.noSelection));
        return;
    }

    const langDir = getLanguageRoot(document.uri.fsPath);
    if (!langDir || !fs.existsSync(langDir)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.notInLanguageFolder));
        return;
    }

    if (argument && argument.mode === 'create') {
        await createTermAndInsert(editor, targetRange, targetVisible, targetTerm, langDir);
        return;
    }

    const dictionary = loadTermDictionary(langDir);
    const items = [];

    if (alreadyWrapped) {
        items.push({
            label: `$(close) ${translate(nls_ts.plugin.term.add.pick.removeMarkup)}`,
            action: 'removeMarkup',
        });
    }

    const exactMatch = dictionary.get(targetTerm);

    const ciMatches = [];
    if (!exactMatch) {
        const lower = targetTerm.toLowerCase();
        for (const def of dictionary.values()) {
            if (def.term.toLowerCase() === lower) ciMatches.push(def);
        }
    }

    if (alreadyWrapped && exactMatch) {
        // already wrapped, exact match — только removeMarkup
    } else if (exactMatch) {
        items.push({
            label: exactMatch.term,
            description: exactMatch.definition,
            detail: exactMatch.category,
            action: 'use',
            def: exactMatch,
        });
    } else if (ciMatches.length > 0) {
        const hint = translate(nls_ts.plugin.term.add.pick.caseInsensitiveHint);
        for (const def of ciMatches) {
            items.push({
                label: def.term,
                description: `${def.definition}  (${hint})`,
                detail: def.category,
                action: 'use',
                def,
            });
        }
        items.push({
            label: `$(add) ${translate(nls_ts.plugin.term.add.pick.createWithCase, targetTerm)}`,
            action: 'create',
            alwaysShow: true,
        });
    } else {
        for (const def of dictionary.values()) {
            items.push({
                label: def.term,
                description: def.definition,
                detail: def.category,
                action: 'use',
                def,
            });
        }
        items.push({
            label: `$(add) ${translate(nls_ts.plugin.term.add.pick.createNew, targetTerm)}`,
            action: 'create',
            alwaysShow: true,
        });
    }

    if (items.length === 0) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.term.add.warning.emptyDictionary, targetTerm));
        return;
    }

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: translate(nls_ts.plugin.term.add.pick.placeholder, targetTerm),
        matchOnDescription: true,
        matchOnDetail: true,
    });
    if (!picked) return;

    if (picked.action === 'removeMarkup') {
        await unwrapTerm(editor, targetRange);
        return;
    }

    if (picked.action === 'use' && picked.def) {
        // Видимый текст сохраняем — привязываемся к picked.def.term через data-term.
        await wrapInTerm(editor, targetRange, targetVisible, picked.def.term);
        await saveAndRegenerate(editor, langDir, picked.def.term, false);
        return;
    }

    if (picked.action === 'create') {
        await createTermAndInsert(editor, targetRange, targetVisible, targetTerm, langDir);
    }
}

async function ux_term_show_full(definition) {
    vscode.window.showInformationMessage(definition);
}

module.exports = { ux_term_add, ux_term_show_full, wrapInTerm, unwrapTerm };
