// @ts-nocheck
// plugins/roadMap/patchers/plantuml.patcher.js

const fs = require('fs');
const path = require('path');

/**
 * Рекурсивный поиск всех html файлов в директории
 */
function walkHtmlFiles(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkHtmlFiles(fullPath, callback);
        } else if (file.endsWith('.html')) {
            callback(fullPath);
        }
    }
}

/**
 * Читает клиентский JS-скрипт из ассетов
 */
function getGanttRuntimeFixScrollScript() {
    const scriptPath = path.resolve(__dirname, 'plantuml.client.js');
    return fs.readFileSync(scriptPath, 'utf-8');
}

/**
 * Постпроцессор для PlantUML: внедряет runtime-скрипты в готовые HTML страницы
 */
async function patchPlantUml(buildDir) {
    console.log(`[PlantUML Patcher] Старт обработки файлов в: ${buildDir}`);
    let processedCount = 0;

    walkHtmlFiles(buildDir, htmlPath => {
        let content = fs.readFileSync(htmlPath, 'utf8');

        // Проверяем, есть ли на странице контейнер Ганта
        if (content.includes('gantt-raw-container')) {
            const bodyCloseIndex = content.lastIndexOf('</body>');

            if (bodyCloseIndex !== -1) {
                const scriptTag = `\n<script>\n${getGanttRuntimeFixScrollScript()}\n</script>\n`;
                const newContent = content.slice(0, bodyCloseIndex) + scriptTag + content.slice(bodyCloseIndex);

                fs.writeFileSync(htmlPath, newContent, 'utf8');
                processedCount++;
                console.log(`[PlantUML Patcher] Внедрен скриптPan/Zoom в: ${htmlPath}`);
            }
        }
    });

    console.log(`[PlantUML Patcher] Завершено. Обработано страниц: ${processedCount}`);
}

module.exports = {
    patchPlantUml,
};
