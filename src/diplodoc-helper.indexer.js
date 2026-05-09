//diplodoc-helper.indexer.js
const fs = require("fs");
const path = require("path");

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
  const INDEXED_TYPES = ["Part", "Section", "Chapter"];

  // 1. Получаем индекс родителя
  const parentIndexPath = path.join(targetDir, "index.md");
  const parentIndex = getMetadataValue(parentIndexPath, "index") || "";

  // 2. Ищем все подпапки (сиблинги будущего раздела)
  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  const siblingIndices = [];

  for (const item of items) {
    if (item.isDirectory()) {
      const indexPath = path.join(targetDir, item.name, "index.md");
      const type = getMetadataValue(indexPath, "type");
      const index = getMetadataValue(indexPath, "index");

      // Нас интересуют только индексируемые типы
      if (type && INDEXED_TYPES.includes(type) && index) {
        // Извлекаем последнюю цифру индекса (после последней точки)
        const parts = index.split(".");
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
