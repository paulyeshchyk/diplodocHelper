// gosts.collector.js
const fs = require('fs');
const path = require('path');
const { getGostOutputDir } = require('./gosts.paths');
const { getTitleFromMetadata } = require('../utils/frontmatter.utils');
// Используем маскировку кода из модуля abbrs (или замените на локальную копию)
const { maskCodeInMarkdown } = require('../abbrs/shared');

/**
 * Сканирует документацию и ищет упоминания ГОСТов.
 * @param {string} langDir 
 * @param {Array} gostsList 
 */
function collectGostReferences(langDir, gostsList) {
  const refs = {};
  for (const gost of gostsList) {
    refs[gost.anchorId] = [];
  }

  let skipFullPaths;
  try {
    skipFullPaths = new Set([path.resolve(getGostOutputDir(langDir))]);
  } catch {
    skipFullPaths = new Set();
  }

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipFullPaths.has(path.resolve(fullPath))) continue;
        if (!entry.name.startsWith('_') && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.md')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const content = maskCodeInMarkdown(raw);
          const href = path.relative(langDir, fullPath).replace(/\\/g, '/');
          const title = getTitleFromMetadata(fullPath) || path.basename(path.dirname(fullPath));

          for (const gost of gostsList) {
            let count = 0;

            // 1. Ищем точное совпадение кода (например, "ГОСТ 3.1201-85")
            const escapedCode = gost.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const codeRe = new RegExp(`(?<![a-zA-Zа-яА-Я0-9-])${escapedCode}(?![a-zA-Zа-яА-Я0-9-])`, 'gi');
            let m;
            while ((m = codeRe.exec(content)) !== null) count++;

            // 2. Ищем ссылки на якорь (например, [текст](../gosts/index.md#gost-31201-85))
            const anchorRe = new RegExp(`#${gost.anchorId}(?![a-zA-Z0-9-])`, 'gi');
            let anchorCount = 0;
            while ((m = anchorRe.exec(content)) !== null) anchorCount++;

            // Берем максимум, чтобы не посчитать дважды, если ссылка обернута вокруг кода
            const totalCount = Math.max(count, anchorCount);

            if (totalCount > 0) {
              refs[gost.anchorId].push({ title, href, occurrences: totalCount });
            }
          }
        } catch (e) {
          console.error(`[gosts] Ошибка обработки ${fullPath}:`, e.message);
        }
      }
    }
  }

  walk(langDir);
  return refs;
}

module.exports = { collectGostReferences };