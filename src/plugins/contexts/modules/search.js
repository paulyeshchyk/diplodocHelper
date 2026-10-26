// modules/search.js

/**
 * Генерирует HTML-контейнер для поиска
 * @param {Object} params
 * @param {string} params.lang - 'ru' или 'en'
 * @param {string} [params.placeholder] - текст-подсказка
 * @returns {string} HTML-разметка
 */
function generateSearchContent({ lang, placeholder }) {
  const defaultPlaceholder = lang === "ru"
    ? "Введите контексты через пробел..."
    : "Enter contexts separated by space...";
  const ph = placeholder || defaultPlaceholder;

  return `
<div id="context-search-container" data-lang="${lang}">
    <input type="text" id="search-input" placeholder="${ph}" style="width:100%; padding:8px; font-size:16px; box-sizing:border-box;">
    <div id="search-results" style="margin-top:10px;"></div>
</div>
`;
}

module.exports = { generateSearchContent };