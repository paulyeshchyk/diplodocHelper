// src/plugins/breadcrumb/inject-breadcrumb.js

const fs = require('fs');
const path = require('path');
const { walkHtmlFilesBuildTitleMap, injectScriptIntoFile, DEFAULT_CONFIG } = require('.');

const { walkHtmlFiles } = require('.');

const { generateBreadcrumbScript } = require('./breadcrumb.extractor');

/**
 * @param {string} buildDir
 * @returns {{ success: string[], failed: string[] }}
 */
function runGeneration(buildDir) {
  /** @type {{ success: string[], failed: string[] }} */
  const results = { success: [], failed: [] };

  if (!fs.existsSync(buildDir)) {
    console.error(`[Breadcrumb] Папка сборки не найдена: ${buildDir}`);
    results.failed.push(buildDir);
    return results;
  }

  const config = { ...DEFAULT_CONFIG, buildDir: buildDir };

  console.log(`[Breadcrumb] Запуск генерации. buildDir = ${buildDir}`);

  const titleMap = walkHtmlFilesBuildTitleMap(buildDir);

  console.log(`[Breadcrumb] Найдено ${titleMap.size} страниц. Вставка крошек...`);

  walkHtmlFiles(buildDir, htmlPath => {
    const script = generateBreadcrumbScript(htmlPath, titleMap, config);

    injectScriptIntoFile(htmlPath, config, script);
  });

  console.log(`[Breadcrumb] Готово!`);
  results.success.push(buildDir);

  return results;
}

if (require.main === module) {
  const buildDir = path.resolve(DEFAULT_CONFIG.buildDir);
  runGeneration(buildDir);
} else {
  module.exports = { runGeneration };
}
