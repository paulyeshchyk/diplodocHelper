// index.js

const { DEFAULT_CONFIG } = require('./breadcrumb.config');
const { walkHtmlFilesBuildTitleMap } = require('./breadcrumb.collector');
const { injectScriptIntoFile } = require('./breadcrumb.injector');
const { walkHtmlFiles } = require('./breadcrumb.collector');

module.exports = {
  DEFAULT_CONFIG,
  walkHtmlFilesBuildTitleMap,
  injectScriptIntoFile,
  walkHtmlFiles,
};
