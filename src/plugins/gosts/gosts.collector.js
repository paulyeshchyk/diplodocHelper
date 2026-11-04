// @ts-nocheck
// gosts.collector.js
const fs = require('fs');
const path = require('path');
const { Fs_Walk_Directory } = require('../utils/fs/Fs_Walk_Directory.ts');
const { getGostOutputDir } = require('./gosts.paths');
const { getTitleFromMetadata } = require('../utils/frontmatter.utils');
// Используем маскировку кода из модуля abbrs (или замените на локальную копию)
const { InlineAnnotation_Mask } = require('../utils/inline-annotation/InlineAnnotation_Mask.ts');

/** @typedef {import('./gosts.types.ts').GostEntryWithAnchor} GostEntryWithAnchor */
/** @typedef {import('./gosts.types.ts').GostRef} GostRef */
/** @typedef {import('./gosts.types.ts').GostRefs} GostRefs */

/**
 * Сканирует документацию и ищет упоминания ГОСТов.
 * @param {string} langDir 
 * @param {GostEntryWithAnchor[]} gostsList
 * @returns {GostRefs}
 */
function collectGostReferences(langDir, gostsList) {
  /** @type {GostRefs} */
  const refs = {};
  for (const gost of gostsList) {
    refs[gost.anchorId] = [];
  }

  /** @type {Set<string>} */
  let skipFullPaths;
  try {
    skipFullPaths = new Set([path.resolve(getGostOutputDir(langDir))]);
  } catch {
    skipFullPaths = new Set();
  }

  
  Fs_Walk_Directory.walkSync({
    dir: langDir,
    skipHidden: true,
    skipUnderscore: true,
    skipFullPaths,
    filterFile: fullPath => fullPath.endsWith('.md'),
    onFile: fullPath => {
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const content = InlineAnnotation_Mask.maskCodeInMarkdown(raw);
        const href = path.relative(langDir, fullPath).replace(/\\/g, '/');
        const title = getTitleFromMetadata(fullPath) || path.basename(path.dirname(fullPath));

        for (const gost of gostsList) {
          let count = 0;
          const escapedCode = gost.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const codeRe = new RegExp(`(?<![a-zA-Zа-яА-Я0-9-])${escapedCode}(?![a-zA-Zа-яА-Я0-9-])`, 'gi');
          let m;
          while ((m = codeRe.exec(content)) !== null) count++;

          const anchorRe = new RegExp(`#${gost.anchorId}(?![a-zA-Z0-9-])`, 'gi');
          let anchorCount = 0;
          while ((m = anchorRe.exec(content)) !== null) anchorCount++;

          const totalCount = Math.max(count, anchorCount);

          if (totalCount > 0) {
            refs[gost.anchorId].push({ title, href, occurrences: totalCount });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[gosts] Ошибка обработки ${fullPath}:`, msg);
      }
    },
  });


  return refs;
}

module.exports = { collectGostReferences };