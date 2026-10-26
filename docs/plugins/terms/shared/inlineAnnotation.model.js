const { slugify_latin_alphanumeric } = require('../../utils/encoding.slugify');

/**
 * @param {string} prefix — 'abbr' | 'term' | ...
 * @param {string} name
 * @returns {string}
 */
function makeAnchorId(prefix, name) {
  return `${prefix}-${slugify_latin_alphanumeric(name)}`;
}

/**
 * @param {string} prefix
 * @param {string} name
 * @param {number} n
 * @returns {string}
 */
function makeOccurrenceId(prefix, name, n) {
  return `${makeAnchorId(prefix, name)}-${n}`;
}

/**
 * @param {any} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Готовит уже собранный HTML к вставке в `<script id="diplodoc-state">`.
 * Diplodoc хранит html-фрагмент как JSON-строку, где `<`, `>` заменены
 * на `&lt;`/`&gt;`, а `"` — на `\"`. `&` не трогаем: значения атрибутов
 * уже прошли escapeHtml на этапе рендера.
 * @param {string} html
 * @returns {string}
 */
function jsonEscapeHtmlForDiplodoc(html) {
  return String(html)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

module.exports = {
  makeAnchorId,
  makeOccurrenceId,
  escapeHtml,
  jsonEscapeHtmlForDiplodoc,
};