const matter = require('gray-matter');
const fs = require('fs');

/**
 * @param {fs.PathOrFileDescriptor} indexMdPath
 * @returns string[]
 */
function frontmatterReadContexts(indexMdPath) {
    try {
        const content = fs.readFileSync(indexMdPath, 'utf8');
        const { data } = frontmatterParse(content);
        const current = data.context || '';
        return current
            .split(',')
            .map((/** @type {string} */ s) => s.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Парсит frontmatter + тело документа
 * @param {string} content
 * @returns {{ data: Record<string, any>, content: string }}
 */
function frontmatterParse(content) {
    // @ts-ignore
    return matter(content);
}

/**
 * Собирает документ обратно из frontmatter и тела
 * @param {Record<string, any>} data
 * @param {string} content
 * @returns {string}
 */
function frontmatterStringify(data, content = '') {
    return matter.stringify(content, data, {});
}

/**
 * Получает значение из frontmatter
 * @param {string} fileContent
 * @param {string} key
 * @param {*} defaultValue
 */
function frontmatterGet(fileContent, key, defaultValue = null) {
    const { data } = frontmatterParse(fileContent);
    return data[key] ?? defaultValue;
}

/**
 * Обновляет/добавляет значение в frontmatter
 * @param {string} fileContent
 * @param {string} key
 * @param {*} value
 * @returns {string}
 */
function frontmatterUpdate(fileContent, key, value) {
    const { data, content } = frontmatterParse(fileContent);
    data[key] = value;
    return frontmatterStringify(data, content);
}

/**
 * Удаляет ключ из frontmatter
 * @param {string} fileContent
 * @param {string} key
 * @returns {string}
 */
function frontmatterRemove(fileContent, key) {
    const { data, content } = frontmatterParse(fileContent);
    delete data[key];
    return frontmatterStringify(data, content);
}

/**
 * @param {fs.PathOrFileDescriptor} indexMdPath
 * @param {string} finalString
 */
function frontmatterReplaceContent(indexMdPath, finalString) {
    let content = fs.readFileSync(indexMdPath, 'utf8');
    const { data, content: body } = frontmatterParse(content);

    data.context = finalString;
    const updatedContent = frontmatterStringify(data, body);

    fs.writeFileSync(indexMdPath, updatedContent, 'utf8');
}

module.exports = {
    frontmatterReplaceContent,
    frontmatterReadContexts,
    frontmatterParse,
    frontmatterStringify,
    frontmatterGet,
    frontmatterUpdate,
    frontmatterRemove,
};
