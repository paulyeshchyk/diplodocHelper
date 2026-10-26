// @ts-nocheck
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { nls_ts, translate } = require('../nls_ts.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadAbbrDictionary } = require('../plugins/abbrs/abbrs.dictionary.js');
const { appendAbbrToDictionary } = require('../plugins/abbrs/abbrs.dictionary.writer.js');
const { findAbbrAroundOffset } = require('../plugins/abbrs/abbrs.textRange.js');
const { inferLang } = require('../plugins/abbrs/abbrs.paths.js');
const { runGeneration } = require('../plugins/abbrs/abbrs');

function escapeHtmlText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Обернуть диапазон в <abbr>.
 *
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} range            — что заменяем
 * @param {string} visibleText            — что показываем в документе
 * @param {string} [lookupAbbr]           — каноническое сокращение из словаря.
 *   Если задано и не совпадает с visibleText — пишется data-abbr="…".
 */
async function wrapInAbbr(editor, range, visibleText, lookupAbbr) {
    const visible = String(visibleText || '').trim();
    if (!visible) return;

    const lookup = String(lookupAbbr || '').trim();
    const needsData = lookup && lookup !== visible;

    let attrs = '';
    if (needsData) {
        attrs = ` data-abbr="${escapeHtmlAttr(lookup)}"`;
    }
    const finalText = `<abbr${attrs}>${escapeHtmlText(visible)}</abbr>`;

    const currentText = editor.document.getText(range).trim();
    if (currentText === finalText) return;

    await editor.edit((/** @type {vscode.TextEditorEdit} */ eb) => {
        eb.replace(range, finalText);
    });
}

/**
 * Создание новой записи в словаре и вставка <abbr> в редактор.
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} targetRange
 * @param {string} targetVisible   — видимый текст (что оборачиваем)
 * @param {string} targetTerm      — ключ в словаре (abbr)
 * @param {string} langDir
 */
async function createAbbrAndInsert(editor, targetRange, targetVisible, targetTerm, langDir) {
    const dictionary = loadAbbrDictionary(langDir);

    if (dictionary.has(targetTerm)) {
        await wrapInAbbr(editor, targetRange, targetVisible, targetTerm);
        await saveAndRegenerate(editor, langDir, targetTerm, false);
        return;
    }

    const full = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.abbr.add.full.prompt, targetTerm),
        placeHolder: translate(nls_ts.plugin.abbr.add.full.placeholder),
        validateInput: v => (!v || v.trim().length === 0 ? translate(nls_ts.plugin.abbr.add.full.error.empty) : null),
    });
    if (!full) return;

    const category = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.abbr.add.category.prompt),
        placeHolder: translate(nls_ts.plugin.abbr.add.category.placeholder),
    });

    const added = appendAbbrToDictionary(
        langDir,
        {
            abbr: targetTerm,
            full: full.trim(),
            category: category && category.trim() ? category.trim() : undefined,
        },
        inferLang(langDir)
    );

    if (!added) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.abbr.add.warning.alreadyInDictionary, targetTerm));
        return;
    }

    await wrapInAbbr(editor, targetRange, targetVisible, targetTerm);
    await saveAndRegenerate(editor, langDir, targetTerm, true);
}

function getAbbrWordRange(document, position) {
    return document.getWordRangeAtPosition(position, /[A-Za-zА-Яа-яЁё0-9_.]+/);
}

async function unwrapAbbr(editor, range) {
    const currentText = editor.document.getText(range);
    const match = currentText.match(/^<abbr\b[^>]*>([\s\S]*?)<\/abbr>$/i);
    if (!match) return;
    await editor.edit(eb => eb.replace(range, match[1]));
}

async function saveAndRegenerate(editor, langDir, abbrText, wasCreated) {
    const document = editor.document;

    if (document.isDirty) {
        const saved = await document.save();
        if (!saved) {
            vscode.window.showWarningMessage(translate(nls_ts.plugin.abbr.add.warning.saveFailed, abbrText));
            return;
        }
    }

    const docsRoot = path.dirname(langDir);

    try {
        const results = runGeneration(docsRoot);
        if (results.failed.length > 0) {
            vscode.window.showWarningMessage(
                translate(nls_ts.plugin.abbr.add.warning.indexFailed, abbrText, results.failed.join(', '))
            );
            return;
        }

        const msg = wasCreated
            ? translate(nls_ts.plugin.abbr.add.info.dictUpdatedAndIndex, abbrText)
            : translate(nls_ts.plugin.abbr.add.info.usedAndIndex, abbrText);
        vscode.window.showInformationMessage(msg);
    } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(translate(nls_ts.plugin.abbr.add.warning.indexFailed, abbrText, m));
    }
}

/**
 * @param {{ mode?: 'create', abbrText?: string } | undefined} [argument]
 */
async function ux_abbr_add(argument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.noEditor));
        return;
    }

    const document = editor.document;
    if (document.languageId !== 'markdown') {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.notMarkdown));
        return;
    }

    const selection = editor.selection;
    /** @type {vscode.Range} */
    let targetRange;
    /** @type {string} */
    let targetTerm; // канонический ключ (lookup в словаре)
    /** @type {string} */
    let targetVisible; // видимый текст, который окажется внутри <abbr>
    let alreadyWrapped = false;

    // 1. Курсор/выделение внутри существующего <abbr>…</abbr>?
    const text = document.getText();
    const offset = document.offsetAt(selection.active);
    const ctx = findAbbrAroundOffset(text, offset);

    if (ctx) {
        targetRange = new vscode.Range(document.positionAt(ctx.startOffset), document.positionAt(ctx.endOffset));
        targetTerm = ctx.abbr; // из data-abbr или из inner
        targetVisible = ctx.visibleText; // что реально видно
        alreadyWrapped = true;
    } else if (!selection.isEmpty) {
        targetRange = selection;
        const raw = document.getText(targetRange).trim();
        const m = raw.match(/^<abbr\b([^>]*)>([\s\S]*?)<\/abbr>$/i);
        if (m) {
            const attrs = m[1];
            const innerText = m[2].trim();
            const dt = attrs.match(/\bdata-abbr\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const dataAbbr = dt ? ((dt[1] !== undefined ? dt[1] : dt[2]) || '').trim() : '';
            targetVisible = innerText;
            targetTerm = dataAbbr || innerText;
            alreadyWrapped = true;
        } else {
            targetVisible = raw;
            targetTerm = raw;
        }
    } else {
        const wordRange = getAbbrWordRange(document, selection.active);
        if (!wordRange) {
            vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.noSelection));
            return;
        }
        targetRange = wordRange;
        targetVisible = document.getText(targetRange).trim();
        targetTerm = targetVisible;
    }

    if (!targetTerm || !targetVisible) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.noSelection));
        return;
    }

    const langDir = getLanguageRoot(document.uri.fsPath);
    if (!langDir || !fs.existsSync(langDir)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.notInLanguageFolder));
        return;
    }

    if (argument && argument.mode === 'create') {
        await createAbbrAndInsert(editor, targetRange, targetVisible, targetTerm, langDir);
        return;
    }

    // 5. QuickPick
    const dictionary = loadAbbrDictionary(langDir);

    /** @typedef {{ label: string, description?: string, detail?: string,
     *             action: 'use' | 'create' | 'removeMarkup',
     *             def?: import('../plugins/abbrs/abbrs.model.js').AbbrDefinition }} PickItem */

    /** @type {PickItem[]} */
    const items = [];

    if (alreadyWrapped) {
        items.push({
            label: `$(close) ${translate(nls_ts.plugin.abbr.add.pick.removeMarkup)}`,
            action: 'removeMarkup',
        });
    }

    const exactMatch = dictionary.get(targetTerm);

    /** @type {import('../plugins/abbrs/abbrs.model.js').AbbrDefinition[]} */
    const ciMatches = [];
    if (!exactMatch) {
        const lower = targetTerm.toLowerCase();
        for (const def of dictionary.values()) {
            if (def.abbr.toLowerCase() === lower) ciMatches.push(def);
        }
    }

    if (alreadyWrapped && exactMatch) {
        // Только «снять разметку» — других действий нет
    } else if (exactMatch) {
        items.push({
            label: exactMatch.abbr,
            description: exactMatch.full,
            detail: exactMatch.category,
            action: 'use',
            def: exactMatch,
        });
    } else if (ciMatches.length > 0) {
        const hint = translate(nls_ts.plugin.abbr.add.pick.caseInsensitiveHint);
        for (const def of ciMatches) {
            items.push({
                label: def.abbr,
                description: `${def.full}  (${hint})`,
                detail: def.category,
                action: 'use',
                def,
            });
        }
        items.push({
            label: `$(add) ${translate(nls_ts.plugin.abbr.add.pick.createWithCase, targetTerm)}`,
            action: 'create',
        });
    } else {
        for (const def of dictionary.values()) {
            items.push({
                label: def.abbr,
                description: def.full,
                detail: def.category,
                action: 'use',
                def,
            });
        }
        items.push({
            label: `$(add) ${translate(nls_ts.plugin.abbr.add.pick.createNew, targetTerm)}`,
            action: 'create',
        });
    }

    if (items.length === 0) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.abbr.add.warning.emptyDictionary, targetTerm));
        return;
    }

    const picked = /** @type {PickItem | undefined} */ (
        await vscode.window.showQuickPick(items, {
            placeHolder: translate(nls_ts.plugin.abbr.add.pick.placeholder, targetTerm),
            matchOnDescription: true,
            matchOnDetail: true,
        })
    );
    if (!picked) return;

    if (picked.action === 'removeMarkup') {
        await unwrapAbbr(editor, targetRange);
        return;
    }

    if (picked.action === 'use' && picked.def) {
        // Видимый текст СОХРАНЯЕМ, привязку к канонической форме — через data-abbr
        await wrapInAbbr(editor, targetRange, targetVisible, picked.def.abbr);
        await saveAndRegenerate(editor, langDir, picked.def.abbr, false);
        return;
    }

    if (picked.action === 'create') {
        await createAbbrAndInsert(editor, targetRange, targetVisible, targetTerm, langDir);
    }
}

async function ux_abbr_show_full(full) {
    vscode.window.showInformationMessage(full);
}

module.exports = { ux_abbr_add, ux_abbr_show_full, wrapInAbbr, unwrapAbbr };
