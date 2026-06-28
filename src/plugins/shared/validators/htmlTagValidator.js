// src/commands/diplodoc-helper.link.Paste.Utils.js

/**
 * Проверяет, находится ли курсор внутри HTML-тега (включая вложенные структуры)
 * @param {{line: number; character: number}} position
 * @param {string} lineText
 * @returns {boolean}
 */
function isCursorInsideHtmlTag(position, lineText) {
    const textBeforeCursor = lineText.substring(0, position.character);

    // Находим все открывающие теги слева
    const openingTags = [...textBeforeCursor.matchAll(/<([a-z1-6]+)(?:\s+[^>]*)*>/gi)];
    // Находим все закрывающие теги слева
    const closingTagsBefore = [...textBeforeCursor.matchAll(/<\/([a-z1-6]+)>/gi)];

    // Считаем, сколько раз каждый тег был закрыт слева
    /** @type {Record<string, number>} */
    const closedCount = {};
    for (let i = closingTagsBefore.length - 1; i >= 0; i--) {
        const name = closingTagsBefore[i][1].toLowerCase();
        closedCount[name] = (closedCount[name] || 0) + 1;
    }

    // Идём по открывающим тегам справа налево, вычитая закрытые
    let unclosedTagBefore = null;
    for (let i = openingTags.length - 1; i >= 0; i--) {
        const name = openingTags[i][1].toLowerCase();
        if (closedCount[name] > 0) {
            closedCount[name]--;
        } else {
            unclosedTagBefore = name;
            break;
        }
    }

    // Если есть хоть один незакрытый тег – мы внутри HTML
    return unclosedTagBefore !== null;
}

// Список void-элементов HTML5 (самозакрывающиеся)
const VOID_ELEMENTS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]);

/**
 * Проверяет, находится ли курсор внутри HTML-тега с учётом всего документа.
 * Использует стек для балансировки открывающих и закрывающих тегов до позиции курсора.
 * @param {string} textBefore – текст документа до позиции курсора
 * @returns {boolean}
 */
function isCursorInsideHtmlTagGlobal(textBefore) {
    // Удаляем HTML-комментарии, чтобы они не влияли на анализ
    const cleanText = textBefore.replace(/<!--[\s\S]*?-->/g, '');

    // Регулярка для тегов: имя может содержать буквы, цифры, дефисы и подчёркивания
    const regex = /<(\/?)([a-zA-Z][a-zA-Z0-9_-]*)(?:\s[^>]*)?>/g;
    const stack = [];
    let match;

    while ((match = regex.exec(cleanText)) !== null) {
        const isClosing = match[1] === '/';
        const tagName = match[2].toLowerCase();
        const fullMatch = match[0];

        if (isClosing) {
            // Закрывающий тег: если стек не пуст и верхний элемент совпадает – удаляем
            if (stack.length > 0 && stack[stack.length - 1] === tagName) {
                stack.pop();
            }
            // Иначе игнорируем (невалидный HTML)
        } else {
            // Открывающий тег: пропускаем самозакрывающиеся (по наличию /> или по списку void)
            const isSelfClosing = /\/\s*>$/.test(fullMatch) || VOID_ELEMENTS.has(tagName);
            if (!isSelfClosing) {
                stack.push(tagName);
            }
        }
    }

    return stack.length > 0;
}

module.exports = { isCursorInsideHtmlTag, isCursorInsideHtmlTagGlobal };
