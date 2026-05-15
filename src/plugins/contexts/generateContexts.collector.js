// src/core/contexts-collector.js
const fs = require("fs");
const path = require("path");
const { getDisplayTitle } = require("./generateContexts.utils");

/**
 * @typedef {Object} PageInfo
 * @property {string} title
 * @property {string} href
 */

/**
 * @typedef {Object} ContextData
 * @property {number} rank
 * @property {PageInfo[]} pages
 */

/**
 * @typedef {Object.<string, ContextData>} ContextMap
 */

/**
 * Собирает все контексты из указанной языковой директории
 * @param {string} langDir
 * @returns {ContextMap}
 */
function collectContextsForLang(langDir) {
  /** @type {ContextMap} */
  const contextMap = {};

  /**
   * @param {string} dir
   */
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        if (file !== "contexts") walk(fullPath);
      } else if (file.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf8");
        const match = content.match(/^---[\s\S]*?context:\s*(.*)[\s\S]*?---/);

        if (match && match[1]) {
          const terms = match[1].split(",").map((t) => t.trim().toLowerCase());
          const displayTitle = getDisplayTitle(fullPath, langDir);
          const relativeToLang = path
            .relative(langDir, fullPath)
            .replace(/\\/g, "/");

          for (const term of terms) {
            if (!contextMap[term]) {
              contextMap[term] = { rank: 0, pages: [] };
            }
            contextMap[term].rank += 1;
            contextMap[term].pages.push({
              title: displayTitle,
              href: relativeToLang,
            });
          }
        }
      }
    }
  }

  walk(langDir);
  return contextMap;
}

module.exports = { collectContextsForLang };
