// diplodoc-helper.cursor.Context.js

/**
 * @typedef {Object} CursorContext
 * @property {boolean} isHtml - Внутри HTML-тега
 * @property {boolean} isList - Внутри списка (нумерованного или маркированного)
 * @property {number} listIndent - Отступ текущего пункта списка (в пробелах)
 * @property {boolean} isTable - Внутри Markdown-таблицы
 * @property {boolean} isCustomBlock - Внутри блочного мета-конструкта {% ... %}
 * @property {string|null} blockType - Имя блока (например, 'note', 'tip' и т.д.)
 */

const vscode = require('vscode');

/**
 * Определяет мета-контексты, в которых находится курсор
 * @param {vscode.TextEditor} editor
 * @returns {CursorContext}
 */
function getCursorContext(editor) {
    const document = editor.document;
    const position = editor.selection.active;
    const currentLineNo = position.line;
    const currentLineText = document.lineAt(currentLineNo).text;

    return {
        isHtml: checkIsInsideHtml(document, position),
        ...checkListContext(document, currentLineNo),
        isTable: checkIsTable(currentLineText),
        ...checkCustomBlockContext(document, currentLineNo),
    };
}

/**
 * 1. ПРОВЕРКА HTML
 * Ищет баланс открывающих и закрывающих тегов от начала документа (или ближайших 50 строк)
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 */
function checkIsInsideHtml(document, position) {
    const startLine = Math.max(0, position.line - 50);
    const range = new vscode.Range(new vscode.Position(startLine, 0), position);
    const textBefore = document.getText(range);

    const cleanText = textBefore
        .replace(/<([a-z1-6]+)[^>]*\/>/gi, '')
        .replace(/<(br|hr|img|input|meta|link)[^>]*>/gi, '');

    const stack = [];
    const tagRegex = /<\/?[a-z1-6][^>]*>/gi;
    let match;

    while ((match = tagRegex.exec(cleanText)) !== null) {
        const tag = match[0];
        if (tag.startsWith('</')) {
            stack.pop();
        } else {
            const tagNameMatch = /<([a-z1-6]+)/i.exec(tag);
            if (tagNameMatch) {
                stack.push(tagNameMatch[1].toLowerCase());
            }
        }
    }

    return stack.length > 0;
}

/**
 * 2. ПРОВЕРКА СПИСКА
 * Проверяет, является ли строка списком и считает отступ
 * @param {vscode.TextDocument} document
 * @param {number} currentLineNo
 */
function checkListContext(document, currentLineNo) {
    const lineText = document.lineAt(currentLineNo).text;

    // Регулярка для строки, которая ЯВЛЯЕТСЯ элементом списка: "+ Item", "1. Item", "  - Item"
    const listMarkerRegex = /^(\s*)(?:[*+-].*|\d+\..*)$/;
    const directMatch = lineText.match(listMarkerRegex);

    // Случай A: Курсор прямо на строке с маркером списка (+ Item2)
    if (directMatch) {
        return {
            isList: true,
            listIndent: directMatch[1].length,
            isDirectItem: true, // Курсор прямо на строке с маркером
        };
    }

    // Случай B: Курсор на пустой строке или тексте без маркёра, но ВНУТРИ списка
    // Проверяем соседей сверху и снизу
    let hasListAbove = false;
    let hasListBelow = false;
    let parentIndent = 0;

    // Ищем вверх ближайшую непустую строку
    for (let i = currentLineNo - 1; i >= 0 && i >= currentLineNo - 10; i--) {
        const prevLine = document.lineAt(i).text;
        if (prevLine.trim() === '') continue; // Пропускаем пустые строки

        const matchAbove = prevLine.match(listMarkerRegex);
        if (matchAbove) {
            hasListAbove = true;
            parentIndent = matchAbove[1].length;
        }
        break; // Проверили первую же непустую строку сверху
    }

    // Ищем вниз ближайшую непустую строку
    for (let i = currentLineNo + 1; i < document.lineCount && i <= currentLineNo + 10; i++) {
        const nextLine = document.lineAt(i).text;
        if (nextLine.trim() === '') continue;

        if (listMarkerRegex.test(nextLine)) {
            hasListBelow = true;
        }
        break; // Проверили первую же непустую строку снизу
    }

    // Если и сверху список, и снизу список — мы точно ВНУТРИ списка!
    // Если список только сверху, но у нас есть отступ (многострочный пункт списка) — мы тоже внутри.
    const isInsideList = (hasListAbove && hasListBelow) || (hasListAbove && getIndent(lineText) > parentIndent);

    return {
        isList: isInsideList,
        listIndent: parentIndent,
        isDirectItem: false, // Курсор внутри тела списка/между пунктами
    };
}

/**
 * @param {string} lineText
 */
function getIndent(lineText) {
    const match = lineText.match(/^(\s*)/);
    return match ? match[1].length : 0;
}

/**
 * 3. ПРОВЕРКА ТАБЛИЦЫ
 * Простая проверка по наличию разделителей '|'
 * @param {string} lineText
 */
function checkIsTable(lineText) {
    return /^\s*\|.*\|\s*$/.test(lineText);
}

/**
 * 4. ПРОВЕРКА КАСТОМНЫХ БЛОКОВ {% note ... %} ... {% endnote %}
 * Ищет открывающие и закрывающие блоки вверх по документу
 * @param {vscode.TextDocument} document
 * @param {number} currentLineNo
 */
function checkCustomBlockContext(document, currentLineNo) {
    const currentLineText = document.lineAt(currentLineNo).text;

    // Регулярки для поиска конструктов
    const openBlockRegex = /{%\s*([a-z0-9_-]+)(?:\s+[^%]*)?%}/i;
    const closeBlockRegex = /{%\s*end[a-z0-9_-]+\s*%}/i;

    // 1. Проверяем, не стоит ли курсор ПРЯМО на строке открытия или закрытия
    const isHeaderLine = openBlockRegex.test(currentLineText) && !closeBlockRegex.test(currentLineText);
    const isFooterLine = closeBlockRegex.test(currentLineText);

    if (isHeaderLine) {
        const match = openBlockRegex.exec(currentLineText);
        return {
            isCustomBlock: true,
            isInsideBlockBody: false, // Мы на строке объявления, не внутри тела!
            isBlockHeader: true,
            blockType: match ? match[1] : null,
        };
    }

    // 2. Если мы не на заголовке, сканируем вверх для поиска незакрытого родителя
    let openCount = 0;
    let blockType = null;
    let isInsideBlockBody = false;

    for (let i = currentLineNo - 1; i >= 0 && i >= currentLineNo - 100; i--) {
        const line = document.lineAt(i).text;

        if (closeBlockRegex.test(line)) {
            openCount++;
        }

        const openMatch = openBlockRegex.exec(line);
        if (openMatch && !openMatch[0].includes('end')) {
            if (openCount > 0) {
                openCount--; // Этот блок был закрыт где-то выше нашего курсора
            } else {
                // Нашли открывающий тег, который НЕ был закрыт до курсора!
                isInsideBlockBody = true;
                blockType = openMatch[1];
                break;
            }
        }
    }

    return {
        isCustomBlock: isInsideBlockBody,
        isInsideBlockBody: isInsideBlockBody, // Строго внутри тела ({% note %} ... СЮДА ... {% endnote %})
        isBlockHeader: false,
        blockType: blockType,
    };
}

/**
 * Преобразует многострочный текст, добавляя нужный отступ к каждой строке
 * @param {string} text - Многострочный текст для вставки
 * @param {number} indentSize - Количество пробелов (contentIndent)
 * @returns {string}
 */
function indentMultilinedText(text, indentSize) {
    const padding = '  '.repeat(indentSize);

    const result = text
        .split('\n')
        .map((line, index) => {
            const trimmed = line.trim();
            if (trimmed === '') return ''; // Пустые строки внутри блока лучше оставлять пустыми
            return padding + trimmed;
        })
        .join('\n');
    return `${result}`;
}

module.exports = { getCursorContext, indentMultilinedText };
