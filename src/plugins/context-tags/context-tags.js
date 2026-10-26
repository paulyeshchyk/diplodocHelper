// @ts-nocheck
// context-tags/context-tags.js

const fs = require('fs');
const path = require('path');
const { walk } = require('../utils/walk');
const { isHtmlFile } = require('../utils/html.utils');

const CONTEXT_SPLITTER = ',';

function runGeneration(buildDir) {
    const results = { success: [], failed: [] };
    if (!fs.existsSync(buildDir)) {
        console.error(`❌ [ContextTags] Папка сборки не найдена: ${buildDir}`);
        results.failed.push(buildDir);
        return results;
    }

    // console.log(`[ContextTags] Запуск. buildDir = ${buildDir}`);

    const filter = fullPath => isHtmlFile(fullPath);
    walk(buildDir, filter, htmlPath => {
        try {
            const content = fs.readFileSync(htmlPath, 'utf8');
            const contextMeta = content.match(/<meta\s+name="context"\s+content="([^"]*)"\s*\/?>/i);
            if (!contextMeta) return;

            const contexts = contextMeta[1]
                .split(CONTEXT_SPLITTER)
                .map(s => s.trim())
                .filter(Boolean);
            if (contexts.length === 0) return;

            const script = generateContextScript(contexts, htmlPath, buildDir);
            if (!script) return;

            let newContent = content;
            const bodyCloseIndex = newContent.lastIndexOf('</body>');
            if (bodyCloseIndex === -1) {
                console.warn(`[ContextTags] Нет </body> в: ${htmlPath}`);
                return;
            }
            newContent =
                newContent.slice(0, bodyCloseIndex) +
                '\n<script>\n' +
                script +
                '\n</script>\n' +
                newContent.slice(bodyCloseIndex);
            fs.writeFileSync(htmlPath, newContent, 'utf8');
            results.success.push(htmlPath);
        } catch (err) {
            console.error(`❌ [ContextTags] Ошибка при обработке ${htmlPath}:`, err);
            results.failed.push(htmlPath);
        }
    });

    console.log(`[ContextTags] Обработано ${results.success.length} файлов, ошибок ${results.failed.length}`);
    return results;
}

function generateContextScript(contexts, htmlPath, buildDir) {
    const rel = path.relative(buildDir, htmlPath).replace(/\\/g, '/');
    const lang = rel.split('/')[0] || 'ru';
    const contextItems = contexts.map(c => {
        const context = c.toLowerCase();
        const slug = context.replace(/\s+/g, '');
        return { label: context, slug: slug };
    });

    // 1. Читаем наш чистый клиентский скрипт
    const templatePath = path.join(__dirname, 'context-tags.client.js');
    const clientScriptCode = fs.readFileSync(templatePath, 'utf8');

    // 2. Формируем переменные-контейнеры для этой конкретной страницы
    const injectedVars = [
        `window.__CONTEXT_ITEMS__ = ${JSON.stringify(contextItems)};`,
        `window.__CONTEXT_LANG__ = ${JSON.stringify(lang)};`,
    ].join('\n');

    // 3. Склеиваем переменные и логику
    return `${injectedVars}\n${clientScriptCode}`;
}

module.exports = { runGeneration };

if (require.main === module) {
    const buildDir = path.resolve('./build');
    runGeneration(buildDir);
}
