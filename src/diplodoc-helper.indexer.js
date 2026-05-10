//diplodoc-helper.indexer.js
const fs = require("fs");
const path = require("path");
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require("./diplodoc-helper.constants");

/**
 * Извлекает значение атрибута из Frontmatter файла index.md
 * @param {string} filePath
 * @param {string} key
 * @returns {string|null}
 */
function getMetadataValue(filePath, key) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(new RegExp(`${key}:\\s*(.*)`));
  return match ? match[1].trim() : null;
}

/**
 * Рассчитывает следующий индекс для нового раздела
 * @param {string} targetDir Путь к папке, ГДЕ создается новый раздел
 * @returns {string} Новый индекс (например, "1.17")
 */
function calculateNextIndex(targetDir) {

  // 1. Получаем индекс родителя
  const parentIndexPath = path.join(targetDir, FrontMatterFiles.INDEX_MD);
  const parentIndex = getMetadataValue(parentIndexPath, "sectionIndex") || "";

  // 2. Ищем все подпапки (сиблинги будущего раздела)
  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  const siblingIndices = [];

  for (const item of items) {
    if (item.isDirectory()) {
      const indexPath = path.join(targetDir, item.name, FrontMatterFiles.INDEX_MD);
      const sectionType = getMetadataValue(indexPath, "sectionType");
      const sectionIndex = getMetadataValue(indexPath, "sectionIndex");

      // Нас интересуют только индексируемые типы
      if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
        // Извлекаем последнюю цифру индекса (после последней точки)
        const parts = sectionIndex.split(".");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          siblingIndices.push(lastNum);
        }
      }
    }
  }

  // 3. Определяем следующий порядковый номер
  const nextSubNumber =
    siblingIndices.length > 0 ? Math.max(...siblingIndices) + 1 : 1;

  // 4. Формируем финальную строку индекса
  return parentIndex === ""
    ? `${nextSubNumber}`
    : `${parentIndex}.${nextSubNumber}`;
}

module.exports = { calculateNextIndex };
