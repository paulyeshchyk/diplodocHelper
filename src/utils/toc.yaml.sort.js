// toc.yaml.sort.js

const fs = require("fs");
const path = require("path");

const {
  normalizeEmptyLines,
  getIndexFromBlock,
  splitTocIntoBlocks,
} = require("./toc.yaml.utils");

const { FrontMatterFiles } = require("./constants");

/**
 * Сортирует элементы toc.yaml, сохраняя форматирование
 * @param {string} baseDir
 */
function sortTocItems(
  baseDir,
  sortOrder = "ascending",
  sortKind = "nonIndexedBottom",
) {
  const tocPath = path.join(baseDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");

  const blocks = splitTocIntoBlocks(content);
  if (blocks.length === 0) return;

  const itemsWithIndex = blocks.map((block) => ({
    block,
    index: getIndexFromBlock(block, baseDir),
  }));

  const indexed = itemsWithIndex.filter((i) => i.index !== null);
  const nonIndexed = itemsWithIndex.filter((i) => i.index === null);

  indexed.sort((a, b) => compareIndexes(a.index, b.index, sortOrder));

  const sortedBlocks =
    sortKind === "nonIndexedTop"
      ? [...nonIndexed.map((i) => i.block), ...indexed.map((i) => i.block)]
      : [...indexed.map((i) => i.block), ...nonIndexed.map((i) => i.block)];

  const newContent =
    content.split(/^(\s*items:)/m)[0] + "items:\n" + sortedBlocks.join("\n");

  fs.writeFileSync(tocPath, normalizeEmptyLines(newContent), "utf8");
}

/**
 * Сравнивает два индекса (например "1.2.3" и "1.10")
 * @param {string} a
 * @param {string} b
 */
function compareIndexes(a, b, order = "ascending") {
  if (!a || !b) return 0;
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const ai = (i < aParts.length ? aParts[i] : 0) || 0;
    const bi = (i < bParts.length ? bParts[i] : 0) || 0;
    if (ai !== bi) {
      return order === "ascending" ? ai - bi : bi - ai;
    }
  }
  return 0;
}

module.exports = { sortTocItems };
