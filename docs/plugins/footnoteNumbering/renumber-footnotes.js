const fs = require('fs');
const path = require('path');
const { collectMdFilesByToc } = require('../utils/toc.order');
const { upsertStyle } = require('../utils/upsert.footnote');
/**
 * Идём по toc.yaml, для каждого md-файла находим соответствующий html
 * в build/. Порядок тот же, что и в документации.
 * @param {string} docsDir
 * @param {string} outputDir
 */
function collectHtmlFilesInTocOrder(docsDir, outputDir) {
    let mdFiles;
    try {
        mdFiles = collectMdFilesByToc(docsDir);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [footnotes] Не удалось прочитать toc.yaml в ${docsDir}: ${msg}`);
        return [];
    }

    // Определяем языковой префикс.
    // docs/ru → "ru" (добавим к относительному пути)
    // docs    → ""  (ничего не добавляем)
    const lastSegment = path.basename(path.resolve(docsDir));
    const langPrefix = /^[a-z]{2}$/i.test(lastSegment) ? lastSegment : '';

    const htmlFiles = [];
    for (const mdPath of mdFiles) {
        const rel = path.relative(docsDir, mdPath).replace(/\.md$/, '.html');
        const relWithLang = langPrefix ? path.join(langPrefix, rel) : rel;
        const htmlPath = path.join(outputDir, relWithLang);

        if (fs.existsSync(htmlPath)) {
            htmlFiles.push(htmlPath);
        } else {
            console.warn(`[footnotes] HTML не найден для ${mdPath} (ожидался ${htmlPath})`);
        }
    }
    return htmlFiles;
}

/**
 * Пересчитывает номера сносок в одном HTML-файле.
 * offset = сколько сносок было во всех файлах до этого.
 * @param {string} html
 * @param {number} offset
 */
function renumberFootnotesInHtml(html, offset) {
    // 1. Собрать локальные номера, использованные на этой странице.
    //    fnrefN и fnN — оба варианта.
    const fnRegex = /\b(fnref|fn)(\d+)\b/g;
    const localNums = new Set();
    let m;
    while ((m = fnRegex.exec(html)) !== null) {
        localNums.add(parseInt(m[2], 10));
    }
    if (localNums.size === 0) {
        return { count: 0, html, changed: false };
    }

    // 2. Mapping local -> global.
    //    Сортируем на случай, если Diplodoc выдал неровный набор.
    const sorted = Array.from(localNums).sort((a, b) => a - b);
    const map = new Map();
    for (const local of sorted) {
        map.set(local, local + offset);
    }

    // 3. Меняем id и href — работает и в HTML, и в JSON-escaped контексте,
    //    потому что сами fn/fnref-токены не экранируются.
    let newHtml = html.replace(
        fnRegex,
        (/** @type {any} */ match, /** @type {any} */ prefix, /** @type {string} */ numStr) => {
            const num = parseInt(numStr, 10);
            return map.has(num) ? `${prefix}${map.get(num)}` : match;
        }
    );

    // 4. Меняем видимые метки [N] — только там, где следом идёт </a> (или &lt;/a&gt; в JSON).
    newHtml = newHtml.replace(
        /\[(\d+)\](<\/a>|&lt;\/a&gt;)/g,
        (/** @type {any} */ match, /** @type {string} */ numStr, /** @type {any} */ closer) => {
            const num = parseInt(numStr, 10);
            return map.has(num) ? `[${map.get(num)}]${closer}` : match;
        }
    );

    // 5. Заставляем сам список начать нумерацию с нужного числа.
    //    Браузер нумерует <ol> позиционно, поэтому правим атрибут start.
    const startNum = offset + 1;
    // 5a. Обычный HTML: <ol class="footnotes-list"> ... </ol>
    newHtml = newHtml.replace(
        /<ol(\s+class="footnotes-list"[^>]*?)>/g,
        (/** @type {any} */ m, /** @type {string} */ attrs) => {
            // если start уже стоит — заменяем значение, иначе добавляем
            if (/\bstart\s*=\s*"\d+"/.test(attrs)) {
                return `<ol${attrs.replace(/\bstart\s*=\s*"\d+"/, `start="${startNum}"`)}>`;
            }
            return `<ol${attrs} start="${startNum}">`;
        }
    );

    // 5b. JSON-escaped форма внутри <script id="diplodoc-state">:
    //     &lt;ol class=\"footnotes-list\"&gt;
    newHtml = newHtml.replace(
        /&lt;ol(\s+class=\\"footnotes-list\\"[^&]*?)&gt;/g,
        (/** @type {any} */ m, /** @type {string} */ attrs) => {
            if (/\bstart\s*=\s*\\"\d+\\"/.test(attrs)) {
                return `&lt;ol${attrs.replace(/\bstart\s*=\s*\\"\d+\\"/, `start=\\"${startNum}\\"`)}&gt;`;
            }
            return `&lt;ol${attrs} start=\\"${startNum}\\"&gt;`;
        }
    );

    // 6. Гасим CSS-счётчик, который Diplodoc использует для нумерации ol.
    //    counter-reset задаёт значение ДО инкремента, поэтому start - 1.
    const counterValue = startNum - 1;
    const styleDecl = `counter-reset: hier-list-item ${counterValue};`;

    // 6a. Обычный HTML
    newHtml = newHtml.replace(
        /<ol(\s[^>]*class="footnotes-list"[^>]*?)>/g,
        (/** @type {any} */ match, /** @type {string} */ attrs) => `<ol${upsertStyle(attrs, styleDecl, false)}>`
    );

    // 6b. JSON-escaped внутри <script id="diplodoc-state">
    newHtml = newHtml.replace(
        /&lt;ol(\s[^&]*?class=\\"footnotes-list\\"[^&]*?)&gt;/g,
        (/** @type {any} */ match, /** @type {string} */ attrs) => `&lt;ol${upsertStyle(attrs, styleDecl, true)}&gt;`
    );

    return { count: sorted.length, html: newHtml, changed: newHtml !== html };
}

/**
 * @param {{docsDir:string;outputDir:string}} opts
 */
function renumberFootnotes({ docsDir, outputDir }) {
    console.log('[footnotes] Сквозная нумерация сносок в HTML...');

    const htmlFiles = collectHtmlFilesInTocOrder(docsDir, outputDir);
    console.log(`[footnotes] Файлов в очереди: ${htmlFiles.length}`);

    let counter = 1;
    let changedFiles = 0;
    let totalFootnotes = 0;

    for (const file of htmlFiles) {
        try {
            const html = fs.readFileSync(file, 'utf8');
            const offset = counter - 1;
            const { count, html: newHtml, changed } = renumberFootnotesInHtml(html, offset);
            if (count === 0) continue;

            totalFootnotes += count;
            counter += count;

            if (changed) {
                fs.writeFileSync(file, newHtml, 'utf8');
                changedFiles++;
                // console.log(`[footnotes] ${path.relative(outputDir, file)} — сносок: ${count}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`❌ [footnotes] Ошибка в ${file}: ${msg}`);
        }
    }

    console.log(`[footnotes] Готово. Всего сносок: ${totalFootnotes}, изменено файлов: ${changedFiles}`);
    return { success: true, total: totalFootnotes, changed: changedFiles };
}

if (require.main === module) {
    const docsDir = process.argv[2] || './docs';
    const outputDir = process.argv[3] || './build';
    renumberFootnotes({ docsDir, outputDir });
} else {
    module.exports = { renumberFootnotes, renumberFootnotesInHtml, collectHtmlFilesInTocOrder };
}
