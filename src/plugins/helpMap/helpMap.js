// src/commands/generateHelpmap.js

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * @typedef {Object} HelpEntry
 * @property {string} url      - Относительный путь с .html (index.html или article.html)
 * @property {string} title    - Заголовок статьи
 * @property {string} hint     - Подсказка (hint)
 * @property {string} helptag  - helptag (если есть)
 * @property {string} context  - context (если есть)
 * @property {string} lang     - Языковой код (ru, en и т.д.)
 */

const defaultTitleValue = '';
const defaultHintValue = '';
const defaultContextValue = '';
const defaultHelptagValue = '';

/**
 * Собирает данные по всем статьям
 * @param {string} docsDir
 * @returns {{ success: HelpEntry[], failed: string[] }}
 */
function collectHelpData(docsDir) {
  /** @type {HelpEntry[]} */
  const success = [];
  /** @type {string[]} */
  const failed = [];

  /**
   * @param {string} dir
   */
  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (file.startsWith('.')) return;

      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const { data } = matter(content);

          let title = '';
          if (data.pureTitle && String(data.pureTitle).trim() !== '') {
            title = String(data.pureTitle).trim();
          } else if (data.title && String(data.title).trim() !== '') {
            title = String(data.title).trim();
          }

          let relativePath = path
            .relative(docsDir, fullPath)
            .replace(/\.md$/, '')
            .replace(/\\/g, '/');

          // Приводим к корректному виду с расширением .html
          if (relativePath.endsWith('/index') || relativePath === 'index') {
            relativePath += '.html';
          } else if (!relativePath.endsWith('.html')) {
            relativePath += '.html';
          }

          const lang = relativePath.split('/')[0] || 'default';

          /** @type {HelpEntry} */
          const entry = {
            url: relativePath,
            title: title.trim() || defaultTitleValue,
            hint: data.hint?.trim() || defaultHintValue,
            helptag: data.helptag?.trim() || defaultHelptagValue,
            context: data.context?.trim() || defaultContextValue,
            lang: lang,
          };

          success.push(entry);
        } catch (err) {
          let msg = err instanceof Error ? err.message : '${err}'
          console.error(`Ошибка обработки файла ${fullPath}:`, msg);
          failed.push(fullPath);
        }
      }
    });
  }

  walk(docsDir);
  return { success, failed };
}

// ====================== НАСТРОЙКИ ======================

const outputFileName = 'app-help-contents.json';
const outputFolderName = 'build';
const docsFolderName = 'docs';

/**
 * Основная функция генерации
 */
function runGeneration({ docsDir, outputDir = outputFolderName, segregation = false }) {
  const results = collectHelpData(docsDir);

  const absoluteOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.join(process.cwd(), outputDir);

  if (!fs.existsSync(absoluteOutputDir)) {
    fs.mkdirSync(absoluteOutputDir, { recursive: true });
  }

  if (segregation) {
    const langMap = results.success.reduce((acc, item) => {
      const lang = item.lang;
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(item);
      return acc;
    }, {});

    for (const [lang, items] of Object.entries(langMap)) {
      const langPath = path.join(absoluteOutputDir, lang);
      if (!fs.existsSync(langPath)) fs.mkdirSync(langPath, { recursive: true });

      const filePath = path.join(langPath, outputFileName);
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
      console.log(`[${lang}] Сохранено ${items.length} статей`);
    }
  } else {
    const outputPath = path.join(absoluteOutputDir, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(results.success, null, 2), 'utf8');
    console.log(`Общий файл сохранён: ${outputPath} (${results.success.length} статей)`);
  }

  if (results.failed.length > 0) {
    console.warn(`Не удалось обработать ${results.failed.length} файлов`);
  }

  return results;
}

// ====================== ЗАПУСК ======================

if (require.main === module) {
  const projectRoot = process.cwd();
  runGeneration({
    docsDir: path.join(projectRoot, docsFolderName),
    outputDir: outputFolderName,
    segregation: process.argv.includes('--segregate'),
  });
} else {
  module.exports = { runGeneration };
}
