// src/core/breadcrumb/breadcrumb-injector.js
const fs = require("fs");
const path = require("path");

/**
 * Вставляет скрипт в HTML-файл
 * @param {string} htmlPath
 * @param {import('../breadcrumb/breadcrumb.config').BreadcrumbConfig} config
 * @param {string?} script
 */
function injectScriptIntoFile(htmlPath, config, script) {
  if (!script) {
    console.log(`Нет родителей для крошек: ${htmlPath}`);
    return;
  }

  const fileName = path.basename(htmlPath);
  if (config.ignoreFiles.includes(fileName)) {
    console.log(`Игнорируем служебный: ${htmlPath}`);
    return;
  }
  if (fileName === "index.html" && path.dirname(htmlPath) === config.buildDir) {
    console.log(`Пропускаем корневой index.html: ${htmlPath}`);
    return;
  }

  let content = fs.readFileSync(htmlPath, "utf8");
  const bodyCloseIndex = content.lastIndexOf("</body>");

  if (bodyCloseIndex === -1) {
    console.log(`Не найден </body> в: ${htmlPath}`);
    return;
  }

  const newContent =
    content.slice(0, bodyCloseIndex) +
    "\n<script>\n" +
    script +
    "\n</script>\n" +
    content.slice(bodyCloseIndex);

  fs.writeFileSync(htmlPath, newContent, "utf8");
  console.log(`Вставлен скрипт: ${htmlPath}`);
}

module.exports = {
  injectScriptIntoFile,
};
