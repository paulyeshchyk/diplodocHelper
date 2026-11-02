const vscode = require('vscode');
const path = require('path');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadGostDictionary } = require('../plugins/gosts/gosts.dictionary.js');
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
 * Относительная Markdown-ссылка
 * @param {Omit<GostLinkOptions, 'format' | 'pathType'>} options
 */
function createRelativeGostLink(options) {
    return buildGostLink({
        ...options,
        format: 'md',
        pathType: 'relative'
    });
}

/**
 * Прямая HTML-ссылка (для YAML)
 * @param {Omit<GostLinkOptions, 'format' | 'pathType'>} options
 */
function createDirectHtmlGostLink(options) {
    return buildGostLink({
        ...options,
        format: 'html',
        pathType: 'direct'
    });
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

    const entries = loadGostDictionary(langDir, currentLang);
    if (!entries || entries.length === 0) {
        vscode.window.showWarningMessage('Справочник ГОСТов пуст.');
        return;
    }

    // Извлекаем выделенный текст
    const selectedText = editor.document.getText(editor.selection).trim();

    // Преобразуем элементы словаря для QuickPick
    let items = entries.map(item => ({
        label: item.code,
        description: item.title,
        detail: item.status,
        gost: item
    }));

    if (selectedText) {
        const exactMatchIndex = items.findIndex(
            item => item.label.toLowerCase() === selectedText.toLowerCase()
        );

        if (exactMatchIndex !== -1) {
            // Поднимаем совпавший элемент на 1-ю позицию
            const matchedItem = items.splice(exactMatchIndex, 1)[0];
            items.unshift(matchedItem);
        }
    }

    // Создаем экземпляр QuickPick
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = items;
    quickPick.placeholder = 'Выберите ГОСТ для вставки ссылки';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Задаем предварительное значение поиска, если был выделен текст
    if (selectedText) {
        quickPick.value = selectedText;
    }

    // Ожидаем выбор пользователя
    const picked = await new Promise((resolve) => {
        quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0];
            resolve(selection || null);
            quickPick.dispose();
        });
        quickPick.onDidHide(() => {
            resolve(null);
            quickPick.dispose();
        });
        quickPick.show();
    });

    if (!picked) return;

    const linkText = selectedText.length > 0 ? selectedText : picked.gost.code;
    const anchor = `gost-${slugify_latin_alphanumeric(picked.gost.code)}`;
    const gostDir = getGostOutputDir(langDir, currentLang);
    const gostIndexPath = path.join(gostDir, 'index.md');

    const languageId = editor.document.languageId;

    /** @type {GostLinkOptions} */
    const baseOptions = {
        format: 'md',
        pathType: 'relative',
        linkText,
        docPath,
        langDir,
        gostIndexPath,
        anchor,
        lang: currentLang
    };

    let link = '';
    if (languageId === 'yaml') {
        link = createDirectHtmlGostLink(baseOptions);
    } else {
        link = createRelativeGostLink(baseOptions);
    }

    await editor.edit(eb => {
        if (!editor.selection.isEmpty) {
            eb.replace(editor.selection, link);
        } else {
            eb.insert(editor.selection.active, link);
        }
    });
}

module.exports = { 
    ux_gost_insert,
    resolveGostUrl,
    buildGostLink,
    createRelativeGostLink,
    createDirectHtmlGostLink
};