const fs = require('fs');
const path = require('path');
const { outputFileName } = require('./config');

/**
 * @param {Object} params
 * @param {string} params.outputDir   - абсолютный или относительный путь
 * @param {import('./types').HelpEntry[]} params.entries
 * @param {boolean} [params.segregation]
 */
function writeHelpMap({ outputDir, entries, segregation }) {
    const absoluteOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
    if (!fs.existsSync(absoluteOutputDir)) {
        fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }
    if (segregation) {
        /** @type {Record<string, import('./types').HelpEntry[]>} */
        const langMap = entries.reduce((acc, item) => {
            const lang = item.lang;
            if (!acc[lang]) acc[lang] = [];
            acc[lang].push(item);
            return acc;
        }, /** @type {Record<string, import('./types').HelpEntry[]>} */ ({}));
        for (const [lang, items] of Object.entries(langMap)) {
            const langPath = path.join(absoluteOutputDir, lang);
            if (!fs.existsSync(langPath)) fs.mkdirSync(langPath, { recursive: true });
            const filePath = path.join(langPath, outputFileName);
            fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
            console.log(`[${lang}] Сохранено ${items.length} статей`);
        }
    } else {
        const outputPath = path.join(absoluteOutputDir, outputFileName);
        fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf8');
        console.log(`Общий файл сохранён: ${outputPath} (${entries.length} статей)`);
    }
}

module.exports = { writeHelpMap };
