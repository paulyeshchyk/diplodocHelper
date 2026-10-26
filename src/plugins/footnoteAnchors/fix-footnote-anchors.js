const fs = require('fs');
const path = require('path');

/**
 * Исправляет href сносок в собранных HTML: добавляет canonical-путь файла
 * перед якорем, чтобы <base> не «съедал» имя документа.
 *
 * @param {string} buildDir
 * @returns {{success: string[], failed: string[]}}
 */
function fixFootnoteAnchors(buildDir) {
    /** @type {{success: string[], failed: string[]}} */
    const results = { success: [], failed: [] };

    if (!fs.existsSync(buildDir)) {
        console.error(`❌ [FootnoteAnchors] Папка сборки не найдена: ${buildDir}`);
        results.failed.push(buildDir);
        return results;
    }

    /** @type {string[]} */
    const files = [];
    /** @param {string} dir */
    function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.html')) files.push(full);
        });
    }
    walk(buildDir);

    let totalFixed = 0;

    for (const file of files) {
        try {
            let html = fs.readFileSync(file, 'utf8');
            const original = html;

            // 1. Достаём canonical-путь
            const canonicalMatch = html.match(
                /<link\s+rel="canonical"\s+href="([^"]+)"/i
            );
            if (!canonicalMatch) {
                // файл без canonical (например, 404) — пропускаем
                continue;
            }
            const canonical = canonicalMatch[1];

            // 2. Правим ЭКРАНИРОВАННЫЙ вариант (внутри JSON-строки):
            //    href=\"#fn1\"     →  href=\"ru/.../index.html#fn1\"
            //    href=\"#fnref1\"  →  href=\"ru/.../index.html#fnref1\"
            html = html.replace(
                /href=\\"#(fn(?:ref)?\d+)\\"/gi,
                (_, anchor) => `href=\\"${canonical}#${anchor}\\"`
            );

            // 3. На всякий случай — НЕэкранированный вариант
            //    (вдруг шаблон Diplodoc изменится и HTML попадёт в разметку как есть)
            html = html.replace(
                /href="#(fn(?:ref)?\d+)"/gi,
                (_, anchor) => `href="${canonical}#${anchor}"`
            );

            if (html !== original) {
                fs.writeFileSync(file, html, 'utf8');
                totalFixed++;
                results.success.push(file);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`❌ [FootnoteAnchors] Ошибка в ${file}: ${msg}`);
            results.failed.push(file);
        }
    }

    console.log(`[FootnoteAnchors] Исправлено файлов: ${totalFixed}`);
    return results;
}

if (require.main === module) {
    const buildDir = path.resolve(process.argv[2] || './build');
    const r = fixFootnoteAnchors(buildDir);
    if (r.failed.length > 0) process.exitCode = 1;
} else {
    module.exports = { fixFootnoteAnchors };
}