const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

/**
 * @typedef {Object} PageInfo
 * @property {string} title - Отображаемый заголовок (Статья - Раздел)
 * @property {string} href - Относительный путь к файлу
 */

/**
 * @typedef {Object} ContextData
 * @property {number} rank - Количество вхождений термина
 * @property {PageInfo[]} pages - Список страниц, где встречается термин
 */

/**
 * @typedef {Object.<string, ContextData>} ContextMap
 */

// --- Утилиты ---

/**
 * Преобразует строку в безопасное имя файла
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return str
    .replace(/[^\p{L}\p{N}\-\._]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Извлекает title из метаданных или H1
 * @param {string} filePath
 * @returns {string|null}
 */
function getTitleFromMetadata(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");

  const metaTitleMatch = content.match(/^---[\s\S]*?title:\s*(.*)[\s\S]*?---/);
  if (metaTitleMatch && metaTitleMatch[1]) return metaTitleMatch[1].trim();

  const h1Match = content.match(/^#\s+(.*)/m);
  return h1Match ? h1Match[1].trim() : null;
}

/**
 * Формирует строку вида "Заголовок статьи - Заголовок раздела"
 * @param {string} fullPath
 * @param {string} langDir
 * @returns {string}
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
 * Рекурсивно собирает контексты из MD-файлов
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
 * Создает индивидуальные MD файлы для каждого термина
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {{ [x: string]: ContextData | { pages: any[]; }; }} contextMap
 */
function writeTermFiles(outputDir, sortedTerms, contextMap) {
  for (const term of sortedTerms) {
    const slug = slugify(term);
    let content = `# ${term.toUpperCase()}\n\n`;
    contextMap[term].pages.forEach((p) => {
      content += `* [${p.title}](../${p.href})\n`;
    });
    fs.writeFileSync(path.join(outputDir, `${slug}.md`), content, "utf8");
  }
}

/**
 * Создает навигационный index.md с группировкой по буквам
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {Object.<string, ContextData>} contextMap
 * @param {string} lang
 * @param {string} title
 */
function writeIndexMd(outputDir, sortedTerms, contextMap, lang, title) {
    const suffix = lang === "ru" ? "ст." : "docs";
    
    // 1. Метаданные: убираем лишние переводы строк в начале
    let content = `---\ntitle: ${title}\n---\n`; 

    let currentLetter = "";

    for (const term of sortedTerms) {
        const firstLetter = term.charAt(0).toUpperCase();
        const slug = slugify(term);
        const count = contextMap[term].rank;

        if (firstLetter !== currentLetter) {
            // 2. Добавляем пустую строку перед новым блоком буквы (если это не самая первая буква)
            if (currentLetter !== "") {
                content += "\n";
            }
            content += `\n## ${firstLetter}\n`;
            currentLetter = firstLetter;
        }

        // 3. Формируем строку списка без лишних отступов внутри группы
        content += `* [${term}](${slug}.md) (${count} ${suffix})\n`;
    }

    fs.writeFileSync(path.join(outputDir, "index.md"), content.trim() + "\n", "utf8");
}

const {
  isDiplodocSection,
  isLanguageRoot,
} = require("./diplodoc-helper.utils");

/**
 * Основная точка входа генерации для конкретного языка
 * @param {string} lang
 * @param {string} langDir
 * @param {ContextMap} contextMap
 * @returns {boolean} - true если файлы успешно созданы
 */
function generateFilesForLang(lang, langDir, contextMap) {
    try {
        // Если контекстов не найдено, не создаем пустой раздел
        if (Object.keys(contextMap).length === 0) return false;

        const outputDir = path.join(langDir, "contexts");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const sortedTerms = Object.keys(contextMap).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
        );

        const title = lang === "ru" ? "Контексты" : "Contexts";

        writeTermFiles(outputDir, sortedTerms, contextMap);
        writeIndexMd(outputDir, sortedTerms, contextMap, lang, title);

        // Генерация YAML
        const slugifiedItems = sortedTerms.map(t => ({ term: t, slug: slugify(t) }));
        
        const tocItems = slugifiedItems.map(i => `  - name: ${i.term}\n    href: ${i.slug}.md`).join("\n");
        fs.writeFileSync(path.join(outputDir, 'toc.yaml'), `title: ${title}\nhref: index.md\nitems:\n${tocItems}`, "utf8");

        const linksYaml = slugifiedItems.map(i => `- title: ${i.term}\n  description: "Rank: ${contextMap[i.term].rank}"\n  href: ${i.slug}.md`).join("\n");
        fs.writeFileSync(path.join(outputDir, 'index.yaml'), `title: ${title}\nlinks:\n${linksYaml}`, "utf8");

        return true;
    } catch (err) {
        console.error(`Error generating files for ${lang}:`, err);
        return false;
    }
}

/**
 * Команда VS Code
 */
async function generateContexts() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const DOCS_ROOT = path.join(projectRoot, "docs");
    const LANGUAGES = ["ru", "en"];

    // Массивы для отслеживания статуса
    const successLangs = [];
    const failedLangs = [];

    try {
        for (const lang of LANGUAGES) {
            const langDir = path.join(DOCS_ROOT, lang);
            
            // Используем вашу утилиту для проверки, что это корень языка
            if (fs.existsSync(langDir) && isLanguageRoot(langDir)) {
                const contextMap = collectContextsForLang(langDir);
                const isGenerated = generateFilesForLang(lang, langDir, contextMap);
                
                if (isGenerated) {
                    successLangs.push(lang);
                } else {
                    failedLangs.push(lang);
                }
            } else {
                // Если папки языка нет физически, считаем это пропуском/ошибкой
                failedLangs.push(lang);
            }
        }

        // --- Логика вывода сообщений ---

        if (successLangs.length === LANGUAGES.length) {
            // Все успешно
            vscode.window.showInformationMessage("✅ Контексты успешно обновлены для всех языков!");
        } else if (successLangs.length > 0) {
            // Частичный успех
            vscode.window.showWarningMessage(
                `⚠️ Контексты обновлены для: ${successLangs.join(', ')}. Пропущены или не найдены: ${failedLangs.join(', ')}`
            );
        } else {
            // Ничего не создано
            vscode.window.showErrorMessage(
                "❌ Не удалось создать контексты. Проверьте наличие тегов 'context:' в метаданных .md файлов."
            );
        }

    } catch (err) {
        if (err instanceof Error)
            vscode.window.showErrorMessage(`Критическая ошибка: ${err.message}`);
    }
}

module.exports = { generateContexts };
