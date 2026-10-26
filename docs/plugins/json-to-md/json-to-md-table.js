const fs = require('fs');
const path = require('path');

/**
 * Генерирует расширенную Diplodoc-таблицу (#|| ... ||#)
 * @param {Array<Object>} issues
 * @returns {string}
 */
function generateExtendedTable(issues) {
    if (!issues || issues.length === 0) return 'Нет данных для отображения.';

    // Экранируем то, что ломает структуру
    const esc = (s) =>
        String(s ?? '—')
            .replace(/\|/g, '&#124;')        // | → &#124; (не разделитель)
            .replace(/\|\|/g, '&#124;&#124;');  // (страховка)

    let result = '#|\n';                       // ← было '#||\n'
    result += '|| **ID** | **Тип** | **Severity** | **Модуль** | **Кратко** | **Подробности** ||\n';

    for (const issue of issues) {
        const details = issue.details && issue.details.trim()
            ? `{% cut "Развернуть" %}\n\n${esc(issue.details.trim())}\n\n{% endcut %}`
            : '—';

        result += '||\n';
        result += `${esc(issue.id)}\n|\n`;
        result += `${esc(issue.type)}\n|\n`;
        result += `${esc(issue.severity)}\n|\n`;
        result += `${esc(issue.module)}\n|\n`;
        result += `${esc(issue.title)}\n|\n`;
        result += `${details}\n`;
        result += '||\n';
    }

    result += '|#\n';
    return result;
}

/**
 * Генерирует стандартную Markdown-таблицу (| ... |)
 * @param {Array<Object>} issues
 * @returns {string}
 */
function generateSimpleTable(issues) {
    if (!issues || issues.length === 0) {
        return 'Нет данных для отображения.';
    }

    let result = '| ID | Тип | Severity | Модуль | Кратко | Подробности |\n';
    result += '| --- | --- | --- | --- | --- | --- |\n';

    for (const issue of issues) {
        const id = (issue.id || '—').replace(/\|/g, '\\|');
        const type = (issue.type || '—').replace(/\|/g, '\\|');
        const severity = (issue.severity || '—').replace(/\|/g, '\\|');
        const moduleStr = (issue.module || '—').replace(/\|/g, '\\|');
        const title = (issue.title || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

        let detailsStr = '—';
        if (issue.details && issue.details.trim()) {
            detailsStr = issue.details
                .trim()
                .replace(/\|/g, '\\|')
                .replace(/\r?\n/g, '<br>');
        }

        result += `| ${id} | ${type} | ${severity} | ${moduleStr} | ${title} | ${detailsStr} |\n`;
    }

    return result;
}

/**
 * Основная функция конвертации
 * @param {Object} options
 * @param {string} options.jsonPath - Путь к входному JSON-файлу
 * @param {string} options.outputDir - Путь к папке вывода
 * @param {string} [options.tableType='extended'] - Вид таблицы ('extended'/'#||' или 'simple'/'standard')
 */
function convertJsonToMdTable({ jsonPath, outputDir, tableType = 'extended' }) {
    console.log(`[json-to-md] Чтение JSON из: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ [json-to-md] Файл не найден: ${jsonPath}`);
        return { success: false };
    }

    let issues;
    try {
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        issues = JSON.parse(rawData);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [json-to-md] Ошибка чтения/парсинга JSON: ${msg}`);
        return { success: false };
    }

    // Создаём папку вывода, если её нет
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const mode = String(tableType).toLowerCase();
    const isSimple = mode === 'simple' || mode === 'standard';

    const mdContent = isSimple ? generateSimpleTable(issues) : generateExtendedTable(issues);

    const fileName = isSimple ? 'known-issues-simple.md' : 'known-issues-summary.md';
    const outputPath = path.join(outputDir, fileName);

    try {
        fs.writeFileSync(outputPath, mdContent, 'utf8');
        console.log(`✅ [json-to-md] Успешно создан файл (${isSimple ? 'простая' : 'расширенная'} таблица): ${outputPath}`);
        return { success: true, outputPath };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [json-to-md] Ошибка записи MD-файла: ${msg}`);
        return { success: false };
    }
}

if (require.main === module) {
    const jsonPath = process.argv[2] || './known-issues-summary.json';
    const outputDir = process.argv[3] || './docs';
    // Допустимые значения для 3-го параметра: extended (по умолчанию) или simple
    const tableType = process.argv[4] || 'extended';

    convertJsonToMdTable({ jsonPath, outputDir, tableType });
} else {
    module.exports = { convertJsonToMdTable, generateExtendedTable, generateSimpleTable };
}