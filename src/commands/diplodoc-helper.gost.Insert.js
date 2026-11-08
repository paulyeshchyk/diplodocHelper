const vscode = require('vscode');
const path = require('path');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadGostDictionary } = require('../plugins/gosts/gosts.dictionary.js');
const { appendGostToDictionary } = require('../plugins/gosts/gosts.dictionary.writer.js');
const { getGostOutputDir, inferLang } = require('../plugins/gosts/gosts.paths.js');
const { slugify_latin_alphanumeric } = require('../plugins/utils/encoding.slugify.js');

/**
 * @typedef {'md' | 'html'} LinkFormat
 * @typedef {'relative' | 'direct'} PathType
 *
 * @typedef {Object} GostUrlOptions
 * @property {PathType} pathType
 * @property {string} docPath
 * @property {string} langDir
 * @property {string} gostIndexPath
 * @property {string} anchor
 * @property {string} [lang='ru']
 *
 * @typedef {Object} GostLinkOptions
 * @property {LinkFormat} format
 * @property {PathType} pathType
 * @property {string} linkText
 * @property {string} docPath
 * @property {string} langDir
 * @property {string} gostIndexPath
 * @property {string} anchor
 * @property {string} [lang='ru']
 */

/**
 * Рассчитывает URL (относительный или прямой) и кодирует кириллицу.
 * 
 * @param {GostUrlOptions} options
 * @returns {string} Экранированный URL
 */
function resolveGostUrl({ pathType, docPath, langDir, gostIndexPath, anchor, lang = 'ru' }) {
    let rawPath = '';

    if (pathType === 'relative') {
        rawPath = path.relative(path.dirname(docPath), gostIndexPath).replace(/\\/g, '/');
        if (!rawPath.startsWith('.')) {
            rawPath = './' + rawPath;
        }
    } else {
        // Direct path: заменяем расширение .md на .html
        let directPath = path.relative(langDir, gostIndexPath).replace(/\\/g, '/');
        if (directPath.endsWith('.md')) {
            directPath = directPath.slice(0, -3) + '.html';
        }

        // Префикс языка в начале пути: /ru/...
        const cleanLang = lang.replace(/^\/+|\/+$/g, '');
        rawPath = `/${cleanLang}/${directPath}`;
    }

    return encodeURI(`${rawPath}#${anchor}`);
}

/**
 * Формирует ссылку в нужной нотации (Markdown или HTML).
 * 
 * @param {GostLinkOptions} options
 * @returns {string} Итоговая ссылка
 */
function buildGostLink(options) {
    const { format, linkText } = options;
    const url = resolveGostUrl(options);

    if (format === 'html') {
        return `<a href="${url}">${linkText}</a>`;
    }

    return `[${linkText}](${url})`;
}

/**
 * @param {Omit<GostLinkOptions, 'format' | 'pathType'>} options
 */
function createRelativeGostLink(options) {
    return buildGostLink({ ...options, format: 'md', pathType: 'relative' });
}

/**
 * @param {Omit<GostLinkOptions, 'format' | 'pathType'>} options
 */
function createDirectHtmlGostLink(options) {
    return buildGostLink({ ...options, format: 'html', pathType: 'direct' });
}

/**
 * Внутренний сценарий «Добавить ГОСТ» (бывший ux_gost_add).
 * Возвращает созданную запись или null, если пользователь отменил/запись уже существует.
 *
 * @param {string} langDir
 * @param {string} lang
 * @param {string} [defaultCode]
 * @returns {Promise<{code:string,title:string,date:string,status:string,description:string} | null>}
 */
async function promptAndAddGost(langDir, lang, defaultCode = '') {
    const code = await vscode.window.showInputBox({
        prompt: 'Обозначение (напр. ГОСТ 11371-78)',
        value: defaultCode,
        ignoreFocusOut: true
    });
    if (!code || !code.trim()) return null;

    const title = await vscode.window.showInputBox({
        prompt: 'Название (напр. Шайба)',
        ignoreFocusOut: true
    });
    if (!title || !title.trim()) return null;

    const date = await vscode.window.showInputBox({ prompt: 'Дата введения', ignoreFocusOut: true });
    const status = await vscode.window.showInputBox({ prompt: 'Статус (Действующий, Заменён...)', ignoreFocusOut: true });
    const description = await vscode.window.showInputBox({ prompt: 'Дополнительная информация', ignoreFocusOut: true });

    const entry = {
        code: code.trim(),
        title: title.trim(),
        date: date ? date.trim() : '',
        status: status ? status.trim() : '',
        description: description ? description.trim() : ''
    };

    const added = appendGostToDictionary(langDir, entry, lang);
    if (!added) {
        vscode.window.showWarningMessage(`⚠️ ГОСТ ${entry.code} уже существует в справочнике.`);
        return null;
    }

    vscode.window.showInformationMessage(`✅ ГОСТ ${entry.code} добавлен!`);
    return entry;
}

async function ux_gost_insert() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Команда доступна только в редакторе.');
        return;
    }

    const docPath = editor.document.uri.fsPath;
    const langDir = getLanguageRoot(docPath);
    if (!langDir) return;

    const currentLang = inferLang(langDir) || 'ru';

    const entries = loadGostDictionary(langDir, currentLang) || [];
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection).trim();

    const baseItems = entries.map(item => ({
        label: item.code,
        description: item.title,
        detail: item.status,
        gost: item
    }));

    /**
     * Пункт «Добавить». Подставляем запрос в label/description/detail, а также
     * ставим alwaysShow: true — чтобы встроенный фильтр VSCode его не скрыл.
     * @param {string} query
     */
    function buildAddItem(query) {
        const q = query.trim();
        const shown = q || 'новый';
        return {
            label: `$(add) Добавить «${shown}»`,
            description: `Создать новую запись в справочнике ГОСТ «${shown}»`,
            detail: 'Нажмите Enter, чтобы заполнить форму',
            alwaysShow: true,
            isAdd: true,
            query: q
        };
    }

    /**
     * @param {string} rawQuery
     */
    function computeItems(rawQuery) {
        const q = (rawQuery || '').trim();
        if (!q) return baseItems.slice();

        const qLower = q.toLowerCase();
        const matched = baseItems.filter(it =>
            it.label.toLowerCase().includes(qLower) ||
            (it.description && it.description.toLowerCase().includes(qLower)) ||
            (it.detail && it.detail.toLowerCase().includes(qLower))
        );

        const exactIdx = matched.findIndex(it => it.label.toLowerCase() === qLower);
        if (exactIdx > 0) {
            const [exact] = matched.splice(exactIdx, 1);
            matched.unshift(exact);
        }

        if (matched.length === 0) {
            return [buildAddItem(q)];
        }
        return matched;
    }

    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Выберите ГОСТ или введите номер для добавления';
    // Ручная фильтрация — включаем проверку description/detail,
    // чтобы встроенный фильтр не выкинул совпадения по названию/статусу.
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.items = computeItems(selectedText);

    quickPick.onDidChangeValue(value => {
        quickPick.items = computeItems(value);
    });

    if (selectedText) {
        quickPick.value = selectedText;
    }

    let settled = false;
    const result = await new Promise(resolve => {
        quickPick.onDidAccept(() => {
            if (settled) return;
            settled = true;
            const picked = quickPick.selectedItems[0] || null;
            const query = quickPick.value.trim();
            quickPick.dispose();
            resolve({ picked, query });
        });
        quickPick.onDidHide(() => {
            if (settled) return;
            settled = true;
            quickPick.dispose();
            resolve({ picked: null, query: '' });
        });
        quickPick.show();
    });

    if (!result.picked) return;

    let gost;
    if (result.picked.isAdd) {
        gost = await promptAndAddGost(langDir, currentLang, result.picked.query);
        if (!gost) return;
    } else {
        gost = result.picked.gost;
    }

    const linkText = selectedText.length > 0 ? selectedText : gost.code;
    const anchor = `gost-${slugify_latin_alphanumeric(gost.code)}`;
    const gostDir = getGostOutputDir(langDir, currentLang);
    const gostIndexPath = path.join(gostDir, 'index.md');

    const languageId = editor.document.languageId;

    /** @type {Omit<GostLinkOptions, 'format' | 'pathType'>} */
    const baseOptions = {
        linkText,
        docPath,
        langDir,
        gostIndexPath,
        anchor,
        lang: currentLang
    };

    const link = languageId === 'yaml'
        ? createDirectHtmlGostLink(baseOptions)
        : createRelativeGostLink(baseOptions);

    await editor.edit(eb => {
        if (!selection.isEmpty) {
            eb.replace(selection, link);
        } else {
            eb.insert(selection.active, link);
        }
    });
}

module.exports = {
    ux_gost_insert,
    resolveGostUrl,
    buildGostLink,
    createRelativeGostLink,
    createDirectHtmlGostLink,
    promptAndAddGost
};