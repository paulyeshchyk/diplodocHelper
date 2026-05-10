// src/core/indexer.js
const fs = require("fs");
const path = require("path");
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require("../utils/constants");
const { get } = require("../utils/frontmatter");

/**
 * Рассчитывает следующий индекс для нового раздела
 * @param {string} targetDir Путь к папке, где создаётся новый раздел
 * @returns {string} Новый индекс (например, "1.17")
 */
function calculateNextIndex(targetDir) {
  const parentIndexPath = path.join(targetDir, FrontMatterFiles.INDEX_MD);
  const parentIndex = get(fs.readFileSync(parentIndexPath, "utf8"), "sectionIndex") || "";

  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  const siblingIndices = [];

  for (const item of items) {
    if (!item.isDirectory()) continue;

    const indexPath = path.join(targetDir, item.name, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(indexPath)) continue;

    const content = fs.readFileSync(indexPath, "utf8");
    const sectionType = get(content, "sectionType");
    const sectionIndex = get(content, "sectionIndex");

    if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
      const parts = sectionIndex.split(".");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) siblingIndices.push(lastNum);
    }
  }

  const nextSubNumber = siblingIndices.length > 0 ? Math.max(...siblingIndices) + 1 : 1;

  return parentIndex === "" ? `${nextSubNumber}` : `${parentIndex}.${nextSubNumber}`;
}

module.exports = { calculateNextIndex };