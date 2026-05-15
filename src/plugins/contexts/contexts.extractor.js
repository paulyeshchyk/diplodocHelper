const fs = require("fs");
const path = require("path");

/**
 * @param {string} fullPath
 * @param {string} langDir
 * @param {any} contextMap
 */
function extractContextTagValue(fullPath, langDir, contextMap) {
  const content = fs.readFileSync(fullPath, "utf8");
  const match = content.match(/^---[\s\S]*?context:\s*(.*)[\s\S]*?---/);

  if (match && match[1]) {
    const terms = match[1].split(",").map((t) => t.trim().toLowerCase());
    const displayTitle = getTitleFromMDMetadata(fullPath, langDir);
    const relativeToLang = path.relative(langDir, fullPath).replace(/\\/g, "/");

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

const { getTitleFromMetadata } = require("../core/utils");

/**
 * Формирует отображаемый заголовок статьи (с учётом родителя)
 * @param {string} fullPath
 * @param {string} langDir
 */
function getTitleFromMDMetadata(fullPath, langDir) {
  const articleTitle =
    getTitleFromMetadata(fullPath) || path.basename(fullPath);
  const parentDir = path.dirname(fullPath);
  const parentIndexPath = path.join(parentDir, "..", "index.md");

  if (parentDir !== langDir) {
    const parentTitle = getTitleFromMetadata(parentIndexPath);
    if (parentTitle) return `${articleTitle} - ${parentTitle}`;
  }
  return articleTitle;
}

module.exports = { extractContextTagValue, getTitleFromMDMetadata };
