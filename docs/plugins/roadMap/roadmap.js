// @ts-nocheck
// plugins/roadMap/roadmap.js

const fs = require('fs');
const path = require('path');
const DiagramEngine = require('./enums/DiagramEngine');
const { generateTableCompact } = require('./builders/table.generator');
const { generateTabsMarkup } = require('../contexts/modules/tabs');

// Импорт билдеров
const { buildPlantUml, getPlantUmlImagePath } = require('./builders/plantuml.builder');

const { buildMermaid } = require('./builders/mermaid.builder');

// Выбор движка по умолчанию (контролируется через Enum)
const CURRENT_ENGINE = DiagramEngine.PLANTUML;

const DEFAULT_DATA_PATH = path.join(__dirname, 'roadmap-data.json');
const ROADMAP_CSS = fs.readFileSync(path.join(__dirname, 'assets', 'roadmap.css'), 'utf-8');

/**
 * Хелпер для разрешения источника данных (path / raw json / object)
 */
function looksLikePath(s) {
    if (!s) return false;
    if (/\.json$/i.test(s)) return true;
    if (/^[./\\]/.test(s)) return true;
    if (/[\\/]/.test(s)) return true;
    return false;
}
function resolveData(dataSource) {
    if (typeof dataSource === 'object' && dataSource !== null) {
        return dataSource;
    }

    if (typeof dataSource === 'string') {
        if (fs.existsSync(dataSource)) {
        const raw = fs.readFileSync(dataSource, 'utf8');
        return JSON.parse(raw);
    }

        if (looksLikePath(dataSource)) {
            console.warn(`[Roadmap] Файл данных не найден: ${dataSource}`);
            return null;
        }
        return JSON.parse(dataSource);
    }

    if (fs.existsSync(DEFAULT_DATA_PATH)) {
        const raw = fs.readFileSync(DEFAULT_DATA_PATH, 'utf8');
        return JSON.parse(raw);
    }
    console.warn(`[Roadmap] Данные не переданы и DEFAULT_DATA_PATH не найден: ${DEFAULT_DATA_PATH}`);
    return null;
}

/**
 * Функция очистки файлов Roadmap при отсутствии данных
 */
function cleanupRoadmapPages(docsRoot) {
    if (!fs.existsSync(docsRoot)) return;

    const languages = fs.readdirSync(docsRoot).filter(dir => {
        const fullPath = path.join(docsRoot, dir);
        return fs.statSync(fullPath).isDirectory() && (dir === 'ru' || dir === 'en');
    });

    for (const lang of languages) {
        const outputDir = path.join(docsRoot, lang, 'roadmap');
        const indexPath = path.join(outputDir, 'index.md');

        // 1. Узнаем, какую картинку создал бы PlantUML генератор
        const { svgAbsolutePath } = getPlantUmlImagePath(outputDir, lang);

        // 2. Если файл картинки существует — удаляем его
        if (fs.existsSync(svgAbsolutePath)) {
            try {
                fs.unlinkSync(svgAbsolutePath);
                console.warn(`[${lang}] Удалена устаревшая диаграмма: ${svgAbsolutePath}`);
            } catch (e) {
                console.error(`❌ [${lang}] Не удалось удалить файл картинки: ${svgAbsolutePath}`, e);
            }
        }

        // 3. Очищаем/перезаписываем страницу index.md
        if (fs.existsSync(indexPath)) {
            const title = lang === 'ru' ? 'Планы' : 'Roadmap';
            const emptyContent = `---\ntitle: ${title}\nsectionType: Page\n---\n\n*Данные временно недоступны.*`;

            fs.writeFileSync(indexPath, emptyContent, 'utf8');
            console.warn(`[${lang}] Страница Roadmap сброшена: ${indexPath}`);
        }
    }
}

/**
 * Главная функция генерации
 * @param {Object|string} options Опции генерации или путь к docsRoot
 * @param {string} options.docsRoot Корневая папка документации
 * @param {string|Object} [options.data] Путь к файлу / raw JSON / JS-объект
 * @param {string} [options.engine] Выбор движка (DiagramEngine.PLANTUML | DiagramEngine.MERMAID)
 */
async function runGeneration(options) {
    const docsRoot = typeof options === 'string' ? options : options?.docsRoot || './docs';

    const dataSource =
        typeof options === 'object'
            ? options.data ?? options.dataPath ?? options.dataRaw ?? null
            : null;

    const engine = (typeof options === 'object' && options.engine) || CURRENT_ENGINE;

    let data = null;
    try {
        data = resolveData(dataSource);
    } catch (err) {
        console.error('❌ [Roadmap] Ошибка парсинга данных:', err.message);
    }

    // Если данные не найдены или произошла ошибка — сбрасываем контент и выходим
    if (!data) {
        console.warn('[Roadmap] Источник данных не найден или пуст. Выполняется очистка старых страниц...');
        cleanupRoadmapPages(docsRoot);
        return;
    }

    const languages = fs.readdirSync(docsRoot).filter(dir => {
        const fullPath = path.join(docsRoot, dir);
        return fs.statSync(fullPath).isDirectory() && (dir === 'ru' || dir === 'en');
    });

    if (languages.length === 0) {
        console.warn('Нет языковых папок (ru/en) в docsRoot');
        return;
    }

    for (const lang of languages) {
        const langDir = path.join(docsRoot, lang);
        const outputDir = path.join(langDir, 'roadmap');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let ganttContent = '';
        const tableContent = generateTableCompact(data);

        // Выбор и запуск подходящего билдера
        switch (engine) {
            case DiagramEngine.PLANTUML:
                ganttContent = await buildPlantUml(data, lang, outputDir, ROADMAP_CSS);
                break;

            case DiagramEngine.MERMAID:
                ganttContent = await buildMermaid(data, lang);
                break;

            default:
                console.error(`❌ [Roadmap] Неизвестный движок диаграмм: ${engine}. Используется Mermaid по умолчанию.`);
                ganttContent = await buildMermaid(data, lang);
                break;
        }

        const tabs = [
            { title: lang === 'ru' ? 'Планы (таблица)' : 'Plans (table)', content: tableContent },
            { title: lang === 'ru' ? 'Планы (диаграмма Ганта)' : 'Plans (Gantt chart)', content: ganttContent },
        ];
        const tabsMarkup = generateTabsMarkup({ tabs, selectedIndex: 0 });

        const title = lang === 'ru' ? 'Планы' : 'Roadmap';
        const frontmatter = `---\ntitle: ${title}\nsectionType: Page\n---\n\n`;
        const content = frontmatter + tabsMarkup;

        const indexPath = path.join(outputDir, 'index.md');
        fs.writeFileSync(indexPath, content, 'utf8');
        console.log(`[${lang}] Roadmap создан (${engine}): ${indexPath}`);
    }

    console.log('Генерация roadmap завершена.');
}

module.exports = {
    runGeneration,
    DiagramEngine,
};
