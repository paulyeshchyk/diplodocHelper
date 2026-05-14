// diplodoc-helper.generateContexts.js
const fs = require("fs");
const path = require("path");

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

/** @import {PluginExecutionResult} from '../core/basetypes' */

// Подключаем vscode только если мы в контексте редактора
const INDEX_MD_DEFAULT_CONTENT = (/** @type {string} */ title) =>
  ["---", `title: ${title}`, "---"].join("\n");

// --- Утилиты ---

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

// --- Сбор данных ---
/**
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
            if (!contextMap[term]) contextMap[term] = { rank: 0, pages: [] };
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

// --- Генерация файлов ---

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 */
function writeTermFiles(outputDir, sortedTerms, contextMap) {
  for (const term of sortedTerms) {
    const slug = slugify(term);
    let content = `# ${term.toUpperCase()}\n\n`;
    contextMap[term]?.pages.forEach((p) => {
      content += `* [${p.title}](../${p.href})\n`;
    });
    fs.writeFileSync(path.join(outputDir, `${slug}.md`), content, "utf8");
  }
}

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 * @param {string} title
 */
function writeIndexMd(outputDir, sortedTerms, contextMap, lang, title) {
  const suffix = lang === "ru" ? "ст." : "docs";
  let content = INDEX_MD_DEFAULT_CONTENT(title);
  let currentLetter = "";
  for (const term of sortedTerms) {
    const firstLetter = term.charAt(0).toUpperCase();
    const slug = slugify(term);
    const count = contextMap[term]?.rank || 0;
    if (firstLetter !== currentLetter) {
      if (currentLetter !== "") content += "\n";
      content += `\n## ${firstLetter}\n`;
      currentLetter = firstLetter;
    }
    content += `* [${term}](${slug}.md) (${count} ${suffix})\n`;
  }
  fs.writeFileSync(
    path.join(outputDir, "index.md"),
    content.trim() + "\n",
    "utf8",
  );
}

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
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const sortedTerms = Object.keys(contextMap).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const title = lang === "ru" ? "Контексты" : "Contexts";
    writeTermFiles(outputDir, sortedTerms, contextMap);
    writeIndexMd(outputDir, sortedTerms, contextMap, lang, title);
    const slugifiedItems = sortedTerms.map((t) => ({
      term: t,
      slug: slugify(t),
    }));
    const tocItems = slugifiedItems
      .map((i) => `  - name: ${i.term}\n    href: ${i.slug}.md`)
      .join("\n");
    fs.writeFileSync(
      path.join(outputDir, "toc.yaml"),
      `title: ${title}\nhref: index.md\nitems:\n${tocItems}`,
      "utf8",
    );
    const linksYaml = slugifiedItems
      .map(
        (i) =>
          `- title: ${i.term}\n  description: "Rank: ${contextMap[i.term].rank}"\n  href: ${i.slug}.md`,
      )
      .join("\n");
    fs.writeFileSync(
      path.join(outputDir, "index.yaml"),
      `title: ${title}\nlinks:\n${linksYaml}`,
      "utf8",
    );
    return true;
  } catch (err) {
    console.error(`Error generating files for ${lang}:`, err);
    return false;
  }
}
/**
 * Глобальная функция логики (без привязки к интерфейсу VS Code)
 * @param {string} docsRoot
 * @returns {PluginExecutionResult}
 */
function runGeneration(docsRoot) {
  /** @type {string[]} */
  const LANGUAGES = ["ru", "en"];

  /** @type {PluginExecutionResult} */
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

// --- МАГИЯ ГИБКОГО ЗАПУСКА ---

if (require.main === module) {
  // Если скрипт запущен напрямую (node или npx)
  console.log("Запуск генерации контекстов в режиме CLI...");
  const projectRoot = process.cwd();
  const DOCS_ROOT = path.join(projectRoot, "docs");

  const results = runGeneration(DOCS_ROOT);

  console.log(`Успешно: ${results.success.join(", ") || "нет"}`);
  if (results.failed.length > 0)
    console.log(`Пропущено: ${results.failed.join(", ")}`);
} else {
  // Если скрипт подключен через require (в extension.js)
  module.exports = { runGeneration };
}
