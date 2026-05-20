// src/plugins/core/breadcrumb/breadcrumb-collector.js
const fs = require("fs");
const path = require("path");
const { extractTitleFromHtml } = require("./breadcrumb.extractor");
const { DEFAULT_CONFIG } = require("./breadcrumb.config");
const { getRelativePath, isRootIndex } = require("../core/utils");
const { walk, isHtmlFile } = require("../core/utils");

/**
 * Собирает карту заголовков всех страниц
 * @param {string} buildDir
 * @returns {Map<string, string>}
 */
function walkHtmlFilesBuildTitleMap(buildDir) {
  /** @type {Map<string, string>} */
  const titleMap = new Map();

  console.log("[Breadcrumb] Сбор заголовков страниц...");

  walkHtmlFiles(buildDir, (htmlPath) => {
    const fileName = path.basename(htmlPath);
    if (DEFAULT_CONFIG.ignoreFiles.includes(fileName)) return;
    if (isRootIndex(buildDir, htmlPath)) return;

    const content = fs.readFileSync(htmlPath, "utf8");
    const title = extractTitleFromHtml(content);

    if (title) {
      const rel = getRelativePath(buildDir, htmlPath);
      titleMap.set(rel, title);
    }
  });

  console.log(`[Breadcrumb] Собрано ${titleMap.size} заголовков.`);
  return titleMap;
}

/**
 * Рекурсивно обходит все HTML-файлы
 * @param {string} dir
 * @param {(htmlPath: string) => void} callback
 */
function walkHtmlFiles(dir, callback) {
  const filter = (/** @type {string}*/ fullPath) => isHtmlFile(fullPath);
  walk(dir, filter, callback);
}

module.exports = { walkHtmlFiles, walkHtmlFilesBuildTitleMap };
