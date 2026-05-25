// src/plugins/core/breadcrumb/breadcrumb-utils.js

const fs = require('fs');
const path = require('path');

/**
 * Извлекает заголовок страницы из HTML
 * @param {string} html
 * @returns {string | null}
 */
function extractTitleFromHtml(html) {
  const stateMatch = html.match(/<script\s+id="diplodoc-state"[^>]*>([\s\S]*?)<\/script>/);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      if (state.data?.title) return state.data.title;
      if (state.title) return state.title;
    } catch (e) { }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Генерирует JS-код для хлебных крошек
 * @param {string} htmlPath
 * @param {Map<string, string>} titleMap
 * @param {import('../breadcrumb/breadcrumb.config').BreadcrumbConfig} config
 * @returns {string | null}
 */
function generateBreadcrumbScript(htmlPath, titleMap, config) {
  const relPath = path.relative(config.buildDir, htmlPath).replace(/\\/g, '/');
  let withoutHtml = relPath.replace(/\.html$/, '');
  if (withoutHtml === '' || withoutHtml === 'index') return null;

  let segments = withoutHtml.split('/').filter(s => s && s !== 'index');
  if (segments.length < 2) return null;

  const lang = segments[0];
  const parentSegments = segments.slice(1, -1);
  if (parentSegments.length === 0) return null;

  // Читаем шаблон
  let template = fs.readFileSync(
    path.join(__dirname, '../breadcrumb/breadcrumb.template.js'),
    'utf8'
  );

  const titlesJson = JSON.stringify(Object.fromEntries(titleMap));
  const separatorJson = JSON.stringify(config.separator);
  const classesJson = JSON.stringify(config.cssClasses);
  const containerSelectorJson = JSON.stringify(config.containerSelector);
  const langJson = JSON.stringify(lang);
  const parentSegmentsJson = JSON.stringify(parentSegments);

  template = template
    .replace('{{TITLES_MAP}}', titlesJson)
    .replace('{{SEPARATOR}}', separatorJson)
    .replace('{{CLASSES}}', classesJson)
    .replace('{{CONTAINER_SELECTOR}}', containerSelectorJson)
    .replace('{{LANG}}', langJson)
    .replace('{{PARENT_SEGMENTS}}', parentSegmentsJson);

  return template;
}
module.exports = {
  extractTitleFromHtml,
  generateBreadcrumbScript,
};
