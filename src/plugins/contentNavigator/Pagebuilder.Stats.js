// contentNavigator/Pagebuilder.Stats.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process'); // Добавили встроенный модуль для консольных команд

const STAT_FILENAME = 'app-help-contents.json';
const PRESETS_YAML_FILENAME = 'presets.yaml';
const GIT_META_FILENAME = 'git-meta.json';

// Безопасное выполнение git-команд
/**
 * @param {string} command
 */
function getGitInfo(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (e) {
        // Если git не инициализирован или команды упали, возвращаем дефолт
        return null;
    }
}

/**
 * @param {string} docsDir
 */
function buildGitMeta(docsDir) {
    const gitMetaPath = path.join(docsDir, GIT_META_FILENAME);

    // Дефолтные значения (кэш на случай, если файла ещё нет)
    let gitMeta = {
        firstCommitDate: 'Январь 2025 г.',
        lastCommitHash: 'unknown',
        lastCommitDate: '',
    };

    // Если файл кэша уже существует, читаем его данные
    if (fs.existsSync(gitMetaPath)) {
        try {
            gitMeta = JSON.parse(fs.readFileSync(gitMetaPath, 'utf8'));
        } catch (e) {
            console.log('Предупреждение: Не удалось распарсить git-meta.json, используем дефолт.');
        }
    }

    const isCI = process.env.TF_BUILD || process.env.CI;

    if (!isCI) {
        // МЫ ЛОКАЛЬНО У ТЕХПИСА: Есть доступ к Git, обновляем кэш-файл!
        const firstDate = getGitInfo(
            'git log --all --max-parents=0 --reverse -n 1 --format=%ad --date=format:"%d.%m.%Y"'
        );
        const lastLog = getGitInfo('git log -1 --format="%ad|%H" --date=format:"%d.%m.%Y %H:%M"');

        if (firstDate) gitMeta.firstCommitDate = firstDate;
        if (lastLog && lastLog.includes('|')) {
            const [date, hash] = lastLog.split('|');
            gitMeta.lastCommitDate = date;
            gitMeta.lastCommitHash = hash;
        }

        // Сохраняем обновленные данные в файл, который техпис ЗАКОММИТИТ
        try {
            fs.writeFileSync(gitMetaPath, JSON.stringify(gitMeta, null, 2), 'utf8');
            console.log('=== Локально: Файл git-meta.json успешно обновлен ===');
        } catch (e) {
            let msg = e instanceof Error ? e.message : String(e);
            console.log('Не удалось записать git-meta.json:', msg);
        }
    } else {
        console.log('=== Сборка на CI: используем зафиксированные Git-данные из git-meta.json ===');
    }

    return gitMeta;
}

/**
 * @param {{ outputDir: string; docsDir: string }} opts
 */

function generateStat({ outputDir, docsDir }) {
    const STATS_JSON_PATH = path.join(outputDir, STAT_FILENAME);
    const PRESETS_YAML_PATH = path.join(docsDir, PRESETS_YAML_FILENAME);

    try {
        // 1. Читаем и парсим файл статистики
        const rawData = fs.readFileSync(STATS_JSON_PATH, 'utf8');
        const articles = JSON.parse(rawData);

        if (!Array.isArray(articles)) {
            throw new Error(`Ожидался массив объектов в ${STAT_FILENAME}`);
        }

        // 2. Расчет метрик контента
        const totalArticles = articles.length;

        const totalSize = articles.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
        const avgSizeNumeric = totalArticles ? Math.round(totalSize / totalArticles) : 0;
        const avgSize = `${avgSizeNumeric.toLocaleString('ru-RU')}`; //байт

        const readingTimeNumeric = Math.ceil(avgSizeNumeric / 2500);
        const readingTime = `${readingTimeNumeric}`; // мин.

        const totalSections = articles.filter(item => item.title && /^Раздел\s+\d+/.test(item.title.trim())).length;
        const totalChapters = articles.filter(item => item.title && /^Глава\s+\d+/.test(item.title.trim())).length;

        const uniqueContexts = new Set();
        const uniqueHelptags = new Set();

        articles.forEach(item => {
            if (item.context) {
                item.context.split(',').forEach((/** @type {string} */ val) => {
                    const trimmed = val.trim().toLowerCase();
                    if (trimmed) uniqueContexts.add(trimmed);
                });
            }
            if (item.helptag) {
                item.helptag.split(',').forEach((/** @type {string} */ val) => {
                    const trimmed = val.trim().toLowerCase();
                    if (trimmed) uniqueHelptags.add(trimmed);
                });
            }
        });

        const totalContexts = uniqueContexts.size;
        const totalHelptags = uniqueHelptags.size;

        // --- ИНТЕГРАЦИЯ ЛОГИКИ GIT ---
        const gitMeta = buildGitMeta(docsDir);

        const startDate = gitMeta.firstCommitDate;
        const lastCommitHash = gitMeta.lastCommitHash;
        let lastCommitDate = gitMeta.lastCommitDate;

        // Если мы на CI, или у техписа локально чистый/новый репозиторий без коммитов,
        // и дата пустая — подстрахуемся системным временем сборки.
        if (!lastCommitDate) {
            const now = new Date();
            lastCommitDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Стабы для авторов и версий
        const stubAuthor = '[Вавренюк Виктор Андреевич](mailto:vavrenyuk@ascon.by)';
        const stubVersion = '1.4';

        // 3. Формируем структуру пресетов
        const generateBlock = () =>
            `
    about:
        author: "${stubAuthor}"
        start_date: "${startDate}"
        version: "${stubVersion}"
    stats:
        total_articles: "${totalArticles}"
        avg_size: "${avgSize}"
        reading_time: "${readingTime}"
        total_sections: "${totalSections}"
        total_chapters: "${totalChapters}"
        total_contexts: "${totalContexts}"
        total_tags: "${totalHelptags}"
        last_update: "${lastCommitDate}"
        commit_hash: "${lastCommitHash}"
`.trimEnd();

        const yamlContent = `# Автоматически сгенерированные переменные. Не редактировать вручную.
default:
${generateBlock()}

internal:
${generateBlock()}
`;

        // 4. Запись в файл
        fs.writeFileSync(PRESETS_YAML_PATH, yamlContent, 'utf8');
        console.log('✓ presets.yaml успешно обновлен с учетом Git-данных!');
    } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
        console.error('❌ Ошибка обработки статистики:', msg);
    }
}

module.exports = { generateStat };
