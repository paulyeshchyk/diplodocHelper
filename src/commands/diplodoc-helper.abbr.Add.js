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
const { extractDataAbbr } = require('../plugins/abbrs/abbrs.injector.js')
const { QuickPick_Build_DictionaryItems } = require('../plugins/utils/quickpick/QuickPick_Build_DictionaryItems.ts')
const { QuickPick_Pick_From_List } = require('../plugins/utils/quickpick/QuickPick_Pick_From_List.ts')

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

function resolveAbbrTarget(editor) {
    const doc = editor.document;
    const selection = editor.selection;
    const text = doc.getText();
    const offset = doc.offsetAt(selection.active);

    // а) курсор внутри существующего <abbr>...</abbr>
    const ctx = findAbbrAroundOffset(text, offset);
    if (ctx) {
        return {
            range: new vscode.Range(doc.positionAt(ctx.startOffset), doc.positionAt(ctx.endOffset)),
            visibleText: ctx.visibleText,
            lookup: ctx.abbr,
            alreadyWrapped: true,
        };
    }

    // б) выделен фрагмент
    if (!selection.isEmpty) {
        const raw = doc.getText(selection).trim();
        const m = raw.match(/^<abbr\b([^>]*)>([\s\S]*?)<\/abbr>$/i);
        if (m) {
            const dataAbbr = extractDataAbbr(m[1]);
            const visible = m[2].trim();
            return { range: selection, visibleText: visible, lookup: dataAbbr || visible, alreadyWrapped: true };
        }
        return { range: selection, visibleText: raw, lookup: raw, alreadyWrapped: false };
    }

    // в) слово под курсором
    const wordRange = getAbbrWordRange(doc, selection.active);
    if (!wordRange) return null;
    const visible = doc.getText(wordRange).trim();
    return { range: wordRange, visibleText: visible, lookup: visible, alreadyWrapped: false };
}

function abbrEntries(dictionary) {
    return Array.from(dictionary.values()).map(def => ({
        key: def.abbr,
        description: def.full,
        category: def.category,
    }));
}

async function showAbbrPicker(target, dictionary) {
    const entries = abbrEntries(dictionary);
    return QuickPick_Pick_From_List.pick({
        placeholder: translate(nls_ts.plugin.abbr.add.pick.placeholder, target.lookup),
        initialValue: target.lookup,
        computeItems: query => QuickPick_Build_DictionaryItems.build({
            entries,
            query,
            alreadyWrapped: target.alreadyWrapped,
            removeMarkupLabel: translate(nls_ts.plugin.abbr.add.pick.removeMarkup),
            createLabel: q => translate(nls_ts.plugin.abbr.add.pick.createNew, q),
        }),
    });
}

async function applyAbbrAction(editor, target, result, langDir) {
    if (!result.picked) return;
    const picked = result.picked;

    if (picked.action === 'removeMarkup') {
        await unwrapAbbr(editor, target.range);
        return;
    }
    if (picked.action === 'use' && picked.def) {
        await wrapInAbbr(editor, target.range, target.visibleText, picked.def.key);
        await saveAndRegenerate(editor, langDir, picked.def.key, false);
        return;
    }
    if (picked.action === 'create') {
        const finalTerm = picked.query || result.query || target.lookup;
        await createAbbrAndInsert(editor, target.range, target.visibleText, finalTerm, langDir);
    }
}

/**
 * @param {{ mode?: 'create', abbrText?: string } | undefined} [argument]
 */
async function ux_abbr_add(argument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.noEditor)); return; }
    if (!['markdown', 'yaml'].includes(editor.document.languageId)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.notMarkdown)); return;
    }

    const target = resolveAbbrTarget(editor);
    if (!target) { vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.noSelection)); return; }

    const langDir = getLanguageRoot(editor.document.uri.fsPath);
    if (!langDir || !fs.existsSync(langDir)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.abbr.add.error.notInLanguageFolder)); return;
    }

    if (argument?.mode === 'create') {
        await createAbbrAndInsert(editor, target.range, target.visibleText, target.lookup, langDir);
        return;
    }

    const dictionary = loadAbbrDictionary(langDir);
    const result = await showAbbrPicker(target, dictionary);
    await applyAbbrAction(editor, target, result, langDir);
}

async function ux_abbr_show_full(full) {
    vscode.window.showInformationMessage(full);
}

module.exports = { ux_abbr_add, ux_abbr_show_full, wrapInAbbr, unwrapAbbr };
