// src/core/contexts-utils.js
const fs = require("fs");
const path = require("path");

/**
 * @param {string} str
 */
function slugify(str) {
  return str
    .replace(/[^\p{L}\p{N}\-\._]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * @param {string} filePath
 */
function getTitleFromMetadata(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const metaTitleMatch = content.match(/^---[\s\S]*?title:\s*(.*)[\s\S]*?---/);
  if (metaTitleMatch && metaTitleMatch[1]) return metaTitleMatch[1].trim();
  const h1Match = content.match(/^#\s+(.*)/m);
  return h1Match ? h1Match[1]?.trim() : null;
}

/**
 * @param {string} fullPath
 * @param {string} langDir
 */
function getDisplayTitle(fullPath, langDir) {
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

const INDEX_MD_DEFAULT_CONTENT = (/** @type {string} */ title) =>
  ["---", `title: ${title}`, `sectionType: Page`, "---"].join("\n");

module.exports = {
  slugify,
  getTitleFromMetadata,
  getDisplayTitle,
  INDEX_MD_DEFAULT_CONTENT,
};
