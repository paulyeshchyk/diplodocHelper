// src/utils/frontmatter.js
const matter = require('gray-matter');

/**
 * Парсит frontmatter + тело документа
 * @param {string} content
 * @returns {{ data: Record<string, any>, content: string }}
 */
function parse(content) {
    return matter(content);
}

/**
 * Собирает документ обратно из frontmatter и тела
 * @param {Record<string, any>} data
 * @param {string} content
 * @returns {string}
 */
function stringify(data, content = '') {
    return matter.stringify(content, data);
}

/**
 * Получает значение из frontmatter
 * @param {string} fileContent
 * @param {string} key
 * @param {*} defaultValue
 */
function get(fileContent, key, defaultValue = null) {
    const { data } = parse(fileContent);
    return data[key] ?? defaultValue;
}

/**
 * Обновляет/добавляет значение в frontmatter
 * @param {string} fileContent
 * @param {string} key
 * @param {*} value
 * @returns {string}
 */
function update(fileContent, key, value) {
    const { data, content } = parse(fileContent);
    data[key] = value;
    return stringify(data, content);
}

/**
 * Удаляет ключ из frontmatter
 * @param {string} fileContent
 * @param {string} key
 * @returns {string}
 */
function remove(fileContent, key) {
    const { data, content } = parse(fileContent);
    delete data[key];
    return stringify(data, content);
}

module.exports = {
    parse,
    stringify,
    get,
    update,
    remove,
};
