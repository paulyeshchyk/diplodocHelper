// src/commands/generateHelpmap.js
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

/**
 * @typedef {Object} HelpEntry
 * @property {string} url - Относительный путь к файлу без расширения
 * @property {string} title - Заголовок статьи
 * @property {string} hint - Подсказка из метаданных
 * @property {string} context - Значение тега helptag
 * @property {string} lang - Языковой код (ru, en и т.д.)
 * @typedef {Object} GenerationResults
 * @property {HelpEntry[]} success - Успешно обработанные записи
 * @property {string[]} failed - Пути к файлам, вызвавшим ошибку
 */

const defaultTitleValue = "Без заголовка";
const defaultHintValue = "";

/**
 * Собирает данные для help-карты
 * @param {string} docsDir 
 * @returns {GenerationResults}
 */
function collectHelpData(docsDir) {
    /**
     * @type {HelpEntry[]}
     */
    const success = [];

    /**
     * @type {string[]}
     */
    const failed = [];

    /**
     * @param {string} dir
     */
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
            const fullPath = path.join(dir, file);
            if (file.startsWith('.')) return;

            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
            } else if (file.endsWith(".md")) {
                try {
                    const content = fs.readFileSync(fullPath, "utf8");
                    const { data } = matter(content);

                    if (data.helptag) {
                        const relativePath = path
                            .relative(docsDir, fullPath)
                            .replace(/\.md$/, "")
                            .replace(/\\/g, "/");

                        // Структура Diplodoc обычно: docs/ru/article.md -> lang = ru
                        const lang = relativePath.split("/")[0] || "default";

                        /** @type {HelpEntry} */
                        const entry = {
                            url: relativePath,
                            title: data.title || defaultTitleValue,
                            hint: data.hint || defaultHintValue,
                            context: data.helptag,
                            lang: lang,
                        };
                        success.push(entry);
                    }
                } catch (err) {
                    failed.push(fullPath);
                }
            }
        });
    }

    walk(docsDir);
    return { success, failed };
}

const outputFileName = "app-help-contents.json";
const outputFolderName = "build";
const docsFolderName = "docs";

/**
 * Основная логика генерации и сохранения
 * @param {Object} options
 * @param {string} options.docsDir - Откуда берем md
 * @param {string} options.outputDir - Куда кладем json (по умолчанию 'build')
 * @param {boolean} options.segregation - Разделять ли по языкам
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
        // Группируем по языкам        
        const langMap = results.success.reduce((acc, item) => {
            if (!acc[item.lang]) acc[item.lang] = [];
            acc[item.lang].push(item);
            return acc;
        }, {});

        for (const [lang, items] of Object.entries(langMap)) {
            const langPath = path.join(absoluteOutputDir, lang);
            if (!fs.existsSync(langPath)) fs.mkdirSync(langPath, { recursive: true });

            const filePath = path.join(langPath, outputFileName);
            fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
            console.log(`[${lang}] Файл сохранён: ${filePath}`);
        }
    } else {
        // Сохраняем одним файлом
        const outputPath = path.join(absoluteOutputDir, outputFileName);
        fs.writeFileSync(outputPath, JSON.stringify(results.success, null, 2));
        console.log(`Общий файл сохранён: ${outputPath}`);
    }

    return results;
}


// Запуск через CLI (node script.js)
if (require.main === module) {
    const projectRoot = process.cwd();

    // В будущем тут можно использовать библиотеку 'yargs' для парсинга --segregation
    runGeneration({
        docsDir: path.join(projectRoot, docsFolderName),
        outputDir: outputFolderName,
        segregation: process.argv.includes("--segregate")
    });
} else {
    module.exports = { runGeneration };
}
