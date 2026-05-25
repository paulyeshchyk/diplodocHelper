// src/core/breadcrumb/breadcrumb-config.js

/** @typedef {Object} CssClasses
 * @property {string} nav
 * @property {string} list
 * @property {string} item
 * @property {string} link
 * @property {string} separator
 */

/** @typedef {Object} BreadcrumbConfig
 * @property {string} buildDir
 * @property {string} separator
 * @property {string} templateFile
 * @property {CssClasses} cssClasses
 * @property {string[]} ignoreFiles
 * @property {string} containerSelector
 */

/** @type {BreadcrumbConfig} */
const DEFAULT_CONFIG = {
  buildDir: './build',
  separator: ' ',
  templateFile: './breadcrumb.template.js',
  cssClasses: {
    nav: 'dc-breadcrumb',
    list: 'dc-breadcrumb__list',
    item: 'dc-breadcrumb__item',
    link: 'dc-breadcrumb__link',
    separator: 'dc-breadcrumb__separator',
  },
  ignoreFiles: ['404.html', 'search.html'],
  containerSelector: '.dc-doc-page__main',
};

module.exports = {
  DEFAULT_CONFIG,
};
