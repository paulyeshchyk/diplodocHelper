// src/commands/diplodoc-helper.term.Add.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { nls_ts, translate } = require('../nls_ts.js');
const { QuickPick_Pick_From_List } = require('../plugins/utils/quickpick/QuickPick_Pick_From_List.ts');
const { QuickPick_Build_DictionaryItems } = require('../plugins/utils/quickpick/QuickPick_Build_DictionaryItems.ts');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadTermDictionary } = require('../plugins/terms/terms.dictionary.js');
const { appendTermToDictionary } = require('../plugins/terms/terms.dictionary.writer.js');
const { findTermAroundOffset } = require('../plugins/terms/terms.textRange.js');
const { runGeneration } = require('../plugins/terms/terms');
const termsPaths = require('../plugins/terms/terms.paths.js');
const { slugify_latin_alphanumeric } = require('../plugins/utils/encoding.slugify.js');

const inferLang = termsPaths.inferLang;
const getTermOutputDir = termsPaths.getTermOutputDir;
const SUPPORTED_LANGS = new Set(['markdown', 'yaml']);

/**
 * @typedef {Object} TermTarget
 * @property {vscode.Range} range
 * @property {string} visibleText
 * @property {string} lookup
 * @property {boolean} alreadyWrapped
 */

/**
 * @typedef {Object} TermDictionaryEntry
 * @property {string} term
 * @property {string} definition
 * @property {string} [category]
 * @property {string} [description]
 */

/** @typedef {Map<string, TermDictionaryEntry>} TermDictionary */
/** @typedef {import('../plugins/utils/quickpick/QuickPick_Build_DictionaryItems.ts').DictionaryPickerItem} DictionaryPickerItem */
/** @typedef {import('../plugins/utils/quickpick/QuickPick_Pick_From_List.ts').PickResult<DictionaryPickerItem>} TermPickResult */

// ─── escaping ───
/**
 * @param {unknown} s
 * @returns {string}
 */
function escapeHtmlText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {unknown} s
 * @returns {string}
 */
function escapeHtmlAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── term-specific markup ───
/**
 * @param {string} languageId
 * @returns {'md' | 'html'}
 */
function resolveLinkFormat(languageId) {
    // return languageId === 'yaml' ? 'html' : 'md';
    return 'md';
}

/**
 * @param {Object} opts
 * @param {'relative' | 'direct'} opts.pathType
 * @param {string} opts.docPath
 * @param {string} opts.langDir
 * @param {string} opts.termIndexPath
 * @param {string} opts.anchor
 * @param {string} [opts.lang]
 * @returns {string}
 */
function resolveTermUrl({ pathType, docPath, langDir, termIndexPath, anchor, lang = 'ru' }) {
    if (!termIndexPath || !langDir) return `#${anchor}`;
    let rawPath = '';
    if (pathType === 'relative') {
        rawPath = path.relative(path.dirname(docPath), termIndexPath).replace(/\\/g, '/');
        if (!rawPath.startsWith('.')) rawPath = './' + rawPath;
    } else {
        let directPath = path.relative(langDir, termIndexPath).replace(/\\/g, '/');
        if (directPath.endsWith('.md')) directPath = directPath.slice(0, -3) + '.html';
        const cleanLang = lang.replace(/^\/+|\/+$/g, '');
        rawPath = `/${cleanLang}/${directPath}`;
    }
    return encodeURI(`${rawPath}#${anchor}`);
}

/**
 * @param {Object} opts
 * @param {'md' | 'html'} opts.format
 * @param {string} opts.visibleText
 * @param {string} opts.canonicalTerm
 * @param {string} opts.docPath
 * @param {string} opts.langDir
 * @param {string} opts.termIndexPath
 * @param {string} opts.anchor
 * @param {string} opts.lang
 * @returns {string}
 */
function buildTermMarkup({ format, visibleText, canonicalTerm, docPath, langDir, termIndexPath, anchor, lang }) {
    const visible = escapeHtmlText(visibleText);
    const needsDataTerm = canonicalTerm && canonicalTerm !== visibleText;
    let abbrAttrs = 'class="term"';
    if (needsDataTerm) abbrAttrs += ` data-term="${escapeHtmlAttr(canonicalTerm)}"`;
    const abbr = `<abbr ${abbrAttrs}>${visible}</abbr>`;

    if (format === 'html' && typeof getTermOutputDir === 'function' && termIndexPath) {
        const url = resolveTermUrl({ pathType: 'direct', docPath, langDir, termIndexPath, anchor, lang });
        return `<a href="${url}">${abbr}</a>`;
    }
    return abbr;
}

/**
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} range
 * @param {string} visibleText
 * @param {string} lookupTerm
 * @param {string} langDir
 * @returns {Promise<void>}
 */
async function wrapInTerm(editor, range, visibleText, lookupTerm, langDir) {
    const visible = String(visibleText || '').trim();
    if (!visible) return;
    const lookup = String(lookupTerm || '').trim();
    const document = editor.document;
    const docPath = document.uri.fsPath;
    const format = resolveLinkFormat(document.languageId);

    let termIndexPath = '';
    let lang = 'ru';
    if (langDir) {
        lang = inferLang(langDir) || 'ru';
        if (typeof getTermOutputDir === 'function') {
            termIndexPath = path.join(getTermOutputDir(langDir, lang), 'index.md');
        }
    }
    const anchor = `term-${slugify_latin_alphanumeric(lookup || visible)}`;
    const finalText = buildTermMarkup({ format, visibleText: visible, canonicalTerm: lookup, docPath, langDir, termIndexPath, anchor, lang });

    const currentText = document.getText(range).trim();
    if (currentText === finalText) return;
    await editor.edit(eb => eb.replace(range, finalText));
}

/**
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} range
 * @returns {Promise<void>}
 */
async function unwrapTerm(editor, range) {
    const currentText = editor.document.getText(range);
    let match = currentText.match(/^<abbr\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*>([\s\S]*?)<\/abbr>$/i);
    if (!match) {
        match = currentText.match(/^<a\b[^>]*>\s*<abbr\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*>([\s\S]*?)<\/abbr>\s*<\/a>$/i);
    }
    if (!match) return;
    await editor.edit(eb => eb.replace(range, match[1]));
}

/**
 * @param {vscode.TextEditor} editor
 * @param {string} langDir
 * @param {string} termText
 * @param {boolean} wasCreated
 * @returns {Promise<void>}
 */
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
            vscode.window.showWarningMessage(translate(nls_ts.plugin.term.add.warning.indexFailed, termText, results.failed.join(', ')));
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

/**
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} targetRange
 * @param {string} targetVisible
 * @param {string} targetTerm
 * @param {string} langDir
 * @returns {Promise<void>}
 */
async function createTermAndInsert(editor, targetRange, targetVisible, targetTerm, langDir) {
    const lang = inferLang(langDir);
    const dictionary = loadTermDictionary(langDir, lang);
    if (dictionary.has(targetTerm)) {
        await wrapInTerm(editor, targetRange, targetVisible, targetTerm, langDir);
        await saveAndRegenerate(editor, langDir, targetTerm, false);
        return;
    }
    const definition = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.term.add.definition.prompt, targetTerm),
        placeHolder: translate(nls_ts.plugin.term.add.definition.placeholder),
        validateInput: v => (!v || v.trim().length === 0 ? translate(nls_ts.plugin.term.add.definition.error.empty) : null),
    });
    if (!definition) return;
    const category = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.term.add.category.prompt),
        placeHolder: translate(nls_ts.plugin.term.add.category.placeholder),
    });
    const added = appendTermToDictionary(langDir, {
        term: targetTerm,
        definition: definition.trim(),
        category: category && category.trim() ? category.trim() : undefined,
    }, lang);
    if (!added) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.term.add.warning.alreadyInDictionary, targetTerm));
        return;
    }
    await wrapInTerm(editor, targetRange, targetVisible, targetTerm, langDir);
    await saveAndRegenerate(editor, langDir, targetTerm, true);
}

// ─── Шаг 1: разрешение цели ───
/**
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @returns {vscode.Range | undefined}
 */
function getTermWordRange(document, position) {
    return document.getWordRangeAtPosition(position, /[A-Za-zА-Яа-яЁё0-9_.]+/);
}

/**
 * @param {string} attrs
 * @returns {string}
 */
function extractDataTerm(attrs) {
    const m = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    return m ? ((m[1] !== undefined ? m[1] : m[2]) || '').trim() : '';
}

/**
 * @param {vscode.TextEditor} editor
 * @returns {TermTarget | null}
 */
function resolveTermTarget(editor) {
    const doc = editor.document;
    const selection = editor.selection;
    const text = doc.getText();
    const offset = doc.offsetAt(selection.active);

    const ctx = findTermAroundOffset(text, offset);
    if (ctx) {
        return {
            range: new vscode.Range(doc.positionAt(ctx.startOffset), doc.positionAt(ctx.endOffset)),
            visibleText: ctx.visibleText,
            lookup: ctx.term,
            alreadyWrapped: true,
        };
    }

    if (!selection.isEmpty) {
        const raw = doc.getText(selection).trim();
        let m = raw.match(/^<abbr\b([^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([\s\S]*?)<\/abbr>$/i);
        if (m) {
            const dataTerm = extractDataTerm(m[1]);
            const visible = m[2].trim();
            return { range: selection, visibleText: visible, lookup: dataTerm || visible, alreadyWrapped: true };
        }
        m = raw.match(/^<a\b[^>]*>\s*<abbr\b([^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([\s\S]*?)<\/abbr>\s*<\/a>$/i);
        if (m) {
            const dataTerm = extractDataTerm(m[1]);
            const visible = m[2].trim();
            return { range: selection, visibleText: visible, lookup: dataTerm || visible, alreadyWrapped: true };
        }
        return { range: selection, visibleText: raw, lookup: raw, alreadyWrapped: false };
    }

    const wordRange = getTermWordRange(doc, selection.active);
    if (!wordRange) return null;
    const visible = doc.getText(wordRange).trim();
    return { range: wordRange, visibleText: visible, lookup: visible, alreadyWrapped: false };
}

// ─── Шаг 2: entries ───
/**
 * @param {TermDictionary} dictionary
 * @returns {import('../plugins/utils/quickpick/QuickPick_Build_DictionaryItems.ts').DictionaryEntry[]}
 */
function termEntries(dictionary) {
    return Array.from(dictionary.values()).map(def => ({
        key: def.term,
        description: def.definition,
        category: def.category,
    }));
}

// ─── Шаг 3: QuickPick ───
/**
 * @param {TermTarget} target
 * @param {TermDictionary} dictionary
 * @returns {Promise<TermPickResult>}
 */
async function showTermPicker(target, dictionary) {
    const entries = termEntries(dictionary);
    return QuickPick_Pick_From_List.pick({
        placeholder: translate(nls_ts.plugin.term.add.pick.placeholder, target.lookup),
        initialValue: target.lookup,
        computeItems: query => QuickPick_Build_DictionaryItems.build({
            entries,
            query,
            alreadyWrapped: target.alreadyWrapped,
            removeMarkupLabel: translate(nls_ts.plugin.term.add.pick.removeMarkup),
            createLabel: q => translate(nls_ts.plugin.term.add.pick.createNew, q),
        }),
    });
}

// ─── Шаг 4: действие ───
/**
 * @param {vscode.TextEditor} editor
 * @param {TermTarget} target
 * @param {TermPickResult} result
 * @param {string} langDir
 * @returns {Promise<void>}
 */
async function applyTermAction(editor, target, result, langDir) {
    if (!result.picked) return;
    const picked = result.picked;

    if (picked.action === 'removeMarkup') {
        await unwrapTerm(editor, target.range);
        return;
    }
    if (picked.action === 'use' && picked.def) {
        await wrapInTerm(editor, target.range, target.visibleText, picked.def.key, langDir);
        await saveAndRegenerate(editor, langDir, picked.def.key, false);
        return;
    }
    if (picked.action === 'create') {
        const finalTerm = picked.query || result.query || target.lookup;
        await createTermAndInsert(editor, target.range, target.visibleText, finalTerm, langDir);
    }
}

// ─── Шаг 5: оркестратор ───
/**
 * @param {{ mode?: 'create', termText?: string } | undefined} [argument]
 * @returns {Promise<void>}
 */
async function ux_term_add(argument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.noEditor)); return; }
    if (!SUPPORTED_LANGS.has(editor.document.languageId)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.notMarkdown)); return;
    }

    const target = resolveTermTarget(editor);
    if (!target) { vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.noSelection)); return; }

    const langDir = getLanguageRoot(editor.document.uri.fsPath);
    if (!langDir || !fs.existsSync(langDir)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.notInLanguageFolder)); return;
    }

    if (argument && argument.mode === 'create') {
        await createTermAndInsert(editor, target.range, target.visibleText, target.lookup, langDir);
        return;
    }

    const lang = inferLang(langDir);
    const dictionary = loadTermDictionary(langDir, lang);
    const result = await showTermPicker(target, dictionary);
    await applyTermAction(editor, target, result, langDir);
}

/**
 * @param {string} definition
 * @returns {Promise<void>}
 */
async function ux_term_show_full(definition) {
    vscode.window.showInformationMessage(definition);
}

module.exports = {
    ux_term_add,
    ux_term_show_full,
    wrapInTerm,
    unwrapTerm,
    resolveLinkFormat,
    resolveTermUrl,
    buildTermMarkup,
};