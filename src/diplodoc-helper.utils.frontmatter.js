// diplodoc-helper.utils.frontmatter.js
const yaml = require("js-yaml");

/**
 * Извлекает значение метаданных из строки содержимого файла с frontmatter.
 * @param {string} content - Содержимое файла (с frontmatter)
 * @param {string} key - Ключ метаданных
 * @returns {string | null}
 */
function getFrontmatterValue(content, key) {
  const match = content.match(new RegExp(`${key}:\\s*(.*)`));
  return match ? match[1].trim().replace(/['"]/g, "") : null;
}

/**
 * Обновляет или добавляет значение метаданных в строке содержимого.
 * @param {string} content - Содержимое файла (с frontmatter)
 * @param {string} key - Ключ метаданных
 * @param {string} value - Новое значение
 * @returns {string} Обновлённое содержимое
 */
function updateFrontmatterValue(content, key, value) {
  const regex = new RegExp(`${key}:.*`);
  if (regex.test(content)) {
    return content.replace(regex, `${key}: ${value}`);
  } else {
    return content.replace(/---\n/, `---\n${key}: ${value}\n`);
  }
}

/**
 * Удаляет ключ из frontmatter (если существует).
 * @param {string} content - Содержимое файла (с frontmatter)
 * @param {string} key - Ключ для удаления
 * @returns {string} Обновлённое содержимое
 */
function removeFrontmatterKey(content, key) {
  const regex = new RegExp(`${key}:.*\\n?`, "g");
  return content.replace(regex, "");
}

module.exports = {
  getFrontmatterValue,
  updateFrontmatterValue,
  removeFrontmatterKey,
};