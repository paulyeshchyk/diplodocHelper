// src/core/generateContexts.js
const path = require("path");
const fs = require("fs");
/** @import {PluginExecutionResult, PageInfo, ContextData, ContextMap} from '../core/basetypes' */

const { collectContextsForLang } = require("./generateContexts.collector");
const {
  writeTermFiles,
  writeIndexMd,
  writeTocAndIndexYaml,
} = require("./generateContexts.writer");

/**
 * @param {string} lang
 * @param {string} langDir
 * @param {ContextMap} contextMap
 * @returns {boolean}
 */
function generateFilesForLang(lang, langDir, contextMap) {
  try {
    if (Object.keys(contextMap).length === 0) return false;

    const outputDir = path.join(langDir, "contexts");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const sortedTerms = Object.keys(contextMap).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );

    const title = lang === "ru" ? "Контексты" : "Contexts";

    writeTermFiles(outputDir, sortedTerms, contextMap);
    writeIndexMd(outputDir, sortedTerms, contextMap, lang, title);
    writeTocAndIndexYaml(outputDir, sortedTerms, contextMap, lang);

    return true;
  } catch (err) {
    console.error(`Error generating files for ${lang}:`, err);
    return false;
  }
}

/**
 * Основная функция генерации контекстов
 * @param {string} docsRoot
 * @returns {{ success: string[], failed: string[] }}
 */
function runGeneration(docsRoot) {
  const LANGUAGES = ["ru", "en"];

  /** @type {{ success: string[], failed: string[] }} */
  const results = { success: [], failed: [] };

  for (const lang of LANGUAGES) {
    const langDir = path.join(docsRoot, lang);
    if (fs.existsSync(langDir)) {
      const contextMap = collectContextsForLang(langDir);
      if (generateFilesForLang(lang, langDir, contextMap)) {
        results.success.push(lang);
      } else {
        results.failed.push(lang);
      }
    }
  }
  return results;
}

module.exports = { runGeneration };
