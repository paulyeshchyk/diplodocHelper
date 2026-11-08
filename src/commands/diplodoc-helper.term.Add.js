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
const termsPaths = require('../plugins/terms/terms.paths.js');
const { slugify_latin_alphanumeric } = require('../plugins/utils/encoding.slugify.js');

const inferLang = termsPaths.inferLang;
// Может отсутствовать в вашей версии terms.paths.js — тогда yaml-вариант
// деградирует до обычного <abbr> (см. buildTermMarkup).
const getTermOutputDir = termsPaths.getTermOutputDir;

const SUPPORTED_LANGS = new Set(['markdown', 'yaml']);

function escapeHtmlText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** markdown → 'md', yaml → 'html' (зеркало логики gost.Insert.js). */
function resolveLinkFormat(languageId) {
    // return languageId === 'yaml' ? 'html' : 'md';
    return 'md';
}

/** Аналог resolveGostUrl — относительный либо прямой URL до индекса глоссария. */
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
 * Аналог buildGostLink — собирает итоговую разметку термина.
 * @returns {string}
 */
function buildTermMarkup({ format, visibleText, canonicalTerm, docPath, langDir, termIndexPath, anchor, lang }) {
    const visible = escapeHtmlText(visibleText);
    const needsDataTerm = canonicalTerm && canonicalTerm !== visibleText;

    let abbrAttrs = 'class="term"';
    if (needsDataTerm) abbrAttrs += ` data-term="${escapeHtmlAttr(canonicalTerm)}"`;
    const abbr = `<abbr ${abbrAttrs}>${visible}</abbr>`;

    // YAML-ветка имеет смысл только если известен путь к индексу глоссария.
    if (format === 'html' && typeof getTermOutputDir === 'function' && termIndexPath) {
        const url = resolveTermUrl({
            pathType: 'direct',
            docPath,
            langDir,
            termIndexPath,
            anchor,
            lang,
        });
        return `<a href="${url}">${abbr}</a>`;
    }

    // markdown (и fallback для yaml, если getTermOutputDir недоступен)
    return abbr;
}

/**
 * Оборачивает диапазон в <abbr class="term"> (markdown) или
 * <a href="…"><abbr class="term">…</abbr></a> (yaml).
 *
 * @param {vscode.TextEditor} editor
 * @param {vscode.Range} range
 * @param {string} visibleText
 * @param {string} [lookupTerm]
 * @param {string} [langDir] — нужен для вычисления URL в yaml-ветке
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

    const finalText = buildTermMarkup({
        format,
        visibleText: visible,
        canonicalTerm: lookup,
        docPath,
        langDir,
        termIndexPath,
        anchor,
        lang,
    });

    const currentText = document.getText(range).trim();
    if (currentText === finalText) return;

    await editor.edit(eb => eb.replace(range, finalText));
}

async function createTermAndInsert(editor, targetRange, targetVisible, targetTerm, langDir) {
    const dictionary = loadTermDictionary(langDir);

    if (dictionary.has(targetTerm)) {
        await wrapInTerm(editor, targetRange, targetVisible, targetTerm, langDir);
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

    await wrapInTerm(editor, targetRange, targetVisible, targetTerm, langDir);
    await saveAndRegenerate(editor, langDir, targetTerm, true);
}

function getTermWordRange(document, position) {
    return document.getWordRangeAtPosition(position, /[A-Za-zА-Яа-яЁё0-9_.]+/);
}

/** Совместимо и с <abbr>…</abbr>, и с <a><abbr>…</abbr></a>. */
async function unwrapTerm(editor, range) {
    const currentText = editor.document.getText(range);
    let match = currentText.match(
        /^<abbr\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*>([\s\S]*?)<\/abbr>$/i
    );
    if (!match) {
        match = currentText.match(
            /^<a\b[^>]*>\s*<abbr\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*>([\s\S]*?)<\/abbr>\s*<\/a>$/i
        );
    }
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
    if (!SUPPORTED_LANGS.has(document.languageId)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.term.add.error.notMarkdown));
        return;
    }

    const selection = editor.selection;
    let targetRange;
    let targetTerm;
    let targetVisible;
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
        const m = raw.match(/^<abbr\b([^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([\s\S]*?)<\/abbr>$/i)
            || raw.match(/^<a\b[^>]*>\s*<abbr\b([^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([\s\S]*?)<\/abbr>\s*<\/a>$/i);
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
        await wrapInTerm(editor, targetRange, targetVisible, picked.def.term, langDir);
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

module.exports = {
    ux_term_add,
    ux_term_show_full,
    wrapInTerm,
    unwrapTerm,
    // Экспортируем на всякий случай, чтобы можно было тестировать/переиспользовать
    resolveLinkFormat,
    resolveTermUrl,
    buildTermMarkup,
};