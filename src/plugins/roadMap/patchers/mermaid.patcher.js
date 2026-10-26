// @ts-nocheck
const fs = require('fs');
const path = require('path');

/**
 * Рекурсивный поиск всех HTML файлов в директории
 */
function findHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * Постпроцессор для Mermaid: инжектит клиентский скрипт кликабельности и стили
 */
async function patchMermaid(buildDir) {
    // console.log(`[Mermaid Patcher] Старт постпроцессинга для директории: ${buildDir}`);

    const clientJsPath = path.resolve(__dirname, 'mermaid.client.js');

    if (!fs.existsSync(clientJsPath)) {
        console.warn(`[Mermaid Patcher] Файл клиентского скрипта не найден: ${clientJsPath}`);
        return;
    }

    const clientJsContent = fs.readFileSync(clientJsPath, 'utf-8');
    const htmlFiles = findHtmlFiles(buildDir);

    let patchedCount = 0;

    // Инжектируемый код (стили курсора/подсветки + сам JS)
    const injectionBundle = `
<style>
  .gantt-wrapper {
    position: relative;
    overflow: hidden;
  }
  .gantt-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .gantt-toggle-btn {
    padding: 6px 12px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
  }
  .gantt-toggle-btn.active {
    background: #007bc1;
    color: #fff;
    border-color: #005a8c;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .gantt-node-clickable {
    cursor: pointer !important;
  }
  .gantt-node-clickable:hover {
    opacity: 0.8;
  }
</style>
<script>
${clientJsContent}
</script>
`;

    htmlFiles.forEach(filePath => {
        let content = fs.readFileSync(filePath, 'utf-8');

        // Инжектим только в те страницы, где есть наша разметка .js-gantt-mapping или mermaid
        if (content.includes('js-gantt-mapping') || content.includes('mermaid')) {
            // Предотвращаем повторный инжект
            if (!content.includes('initMermaidGanttLinks')) {
                content = content.replace('</body>', `${injectionBundle}\n</body>`);
                fs.writeFileSync(filePath, content, 'utf-8');
                patchedCount++;
            }
        }
    });

    console.log(`[Mermaid Patcher] Успешно обработано HTML-файлов: ${patchedCount}`);
}

module.exports = {
    patchMermaid,
};
