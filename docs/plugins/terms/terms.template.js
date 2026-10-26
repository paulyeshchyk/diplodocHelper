const path = require('path');
const { renderTemplate: renderTemplateFrom } = require('./shared');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * @param {string} name
 * @param {Record<string, any>} data
 * @returns {string}
 */
function renderTemplate(name, data) {
  return renderTemplateFrom(TEMPLATES_DIR, name, data);
}

module.exports = { renderTemplate };