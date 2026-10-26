const fs = require('fs');
const path = require('path');

const cache = new Map();

/**
 * @param {string} dir — абсолютный путь к папке шаблонов плагина
 * @param {string} name
 * @returns {string}
 */
function loadTemplate(dir, name) {
  const key = `${dir}::${name}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const full = path.join(dir, name);
  const content = fs.readFileSync(full, 'utf8');
  cache.set(key, content);
  return content;
}

/**
 * @param {string} dir
 * @param {string} name
 * @param {Record<string, any>} data
 * @returns {string}
 */
function renderTemplate(dir, name, data) {
  const tpl = loadTemplate(dir, name);
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) =>
    data[key] === undefined || data[key] === null ? '' : String(data[key])
  );
}

module.exports = { loadTemplate, renderTemplate };