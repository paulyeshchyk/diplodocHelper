const fs = require('fs');
const path = require('path');

// Папка, в которой находится скрипт
const ROOT_DIR = __dirname;
// Имя итогового JSON-файла
const OUTPUT_FILE = path.join(ROOT_DIR, 'known-issues-summary.json');

/**
 * Парсит файл index.md из KnownIssues
 * @param {string} filePath - Путь к index.md
 * @param {string} moduleName - Имя папки-документа (модуля)
 * @param {function} getNextId - Функция-счётчик для получения KI-XXX
 * @returns {Array<Object>} Массив сформированных записей
 */
function parseKnownIssuesFile(filePath, moduleName, getNextId) {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let inKnownIssuesSection = false;
    const items = [];
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Ищем начало нужной секции H2 (##)
        if (line.trim().startsWith('## ')) {
            const headerTitle = line.trim().replace(/^##\s+/, '').trim();
            if (headerTitle === 'Известные ограничения') {
                inKnownIssuesSection = true;
                continue;
            } else if (inKnownIssuesSection) {
                // Если встретили следующий H2 заголовок, выходим из секции
                break;
            }
        }

        if (!inKnownIssuesSection) {
            continue;
        }

        // Ищем подпараграфы H3 (###)
        if (line.trim().startsWith('### ')) {
            // Сохраняем предыдущий сохранённый подпараграф
            if (currentItem) {
                items.push(currentItem);
            }

            const title = line.trim().replace(/^###\s+/, '').trim();
            
            // Формируем относительную MD-ссылку на исходный модуль
            const moduleLink = `[\`${moduleName}\`](../${moduleName}/index.md)`;

            currentItem = {
                id: getNextId(),
                type: 'unknown',
                severity: 'major',
                module: moduleLink,
                title: title,
                detailsLines: []
            };
        } else if (currentItem) {
            // Накапливаем строки содержимого текущей проблемы
            currentItem.detailsLines.push(line);
        }
    }

    // Добавляем последний элемент
    if (currentItem) {
        items.push(currentItem);
    }

    // Очищаем лишние пустые строки в начале и конце "Подробностей"
    return items.map(item => ({
        id: item.id,
        type: item.type,
        severity: item.severity,
        module: item.module,
        title: item.title,
        details: item.detailsLines.join('\n').trim()
    }));
}

/**
 * Основная функция обхода директорий
 */
function main() {
    let globalCounter = 100;
    const getNextId = () => {
        const idStr = String(globalCounter++).padStart(3, '0');
        return `KI-${idStr}`;
    };

    const allIssues = [];

    // Получаем список элементов в рабочей папке
    const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });

    for (const entry of entries) {
        // Обрабатываем только директории (каждая папка — это отдельный документ/модуль)
        if (entry.isDirectory()) {
            const documentDirName = entry.name;
            const targetFilePath = path.join(ROOT_DIR, documentDirName, 'KnownIssues', 'index.md');

            // Условие 1: если в документе есть KnownIssues/index.md — парсим
            if (fs.existsSync(targetFilePath)) {
                console.log(`[+] Обработка: ${documentDirName}/KnownIssues/index.md`);
                const issues = parseKnownIssuesFile(targetFilePath, documentDirName, getNextId);
                allIssues.push(...issues);
            }
        }
    }

    // Сохраняем массив объектов в JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allIssues, null, 2), 'utf-8');

    console.log(`\nГотово! Найдено ограничений: ${allIssues.length}`);
    console.log(`Результат сохранён в: ${OUTPUT_FILE}`);
}

main();