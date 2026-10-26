// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Умный поиск файла конфигурации:
// 1. Рядом с текущим файлом (если запускаем без сборки)
// 2. В папке src (если запускаем из dist/)
const possiblePaths = [
    path.join(__dirname, 'gosts.paths.yaml'),
    path.join(__dirname, '..', '..', 'src', 'plugins', 'gosts', 'gosts.paths.yaml'),
    path.join(process.cwd(), 'src', 'plugins', 'gosts', 'gosts.paths.yaml'),
];
const PATHS_FILE = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

const FALLBACK = {
    ru: 'Дополнительнаяинформация/ГОСТы',
    en: 'Additional information/Standards',
};

let cached = null;

/**
 * @param {string} value
 */
function normalizeSubdir(value) {
    return String(value)
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
}

function loadGostPaths() {
    if (cached) return cached;

    if (!fs.existsSync(PATHS_FILE)) {
        console.warn(`[gosts] ${PATHS_FILE} не найден — использую встроенные пути.`);
        cached = { ...FALLBACK };
        return cached;
    }

    try {
        const raw = yaml.load(fs.readFileSync(PATHS_FILE, 'utf8'));
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error('ожидался объект { lang: path }');
        }
        const result = {};
        for (const [lang, subdir] of Object.entries(raw)) {
            if (typeof subdir !== 'string' || !subdir.trim()) {
                console.warn(`[gosts] ${PATHS_FILE}: пропущен язык "${lang}" (пустой путь).`);
                continue;
            }
            result[lang] = normalizeSubdir(subdir);
        }
        if (Object.keys(result).length === 0) {
            throw new Error('ни одной валидной записи');
        }
        cached = result;
        return cached;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[gosts] Ошибка чтения ${PATHS_FILE}: ${msg} — использую встроенные пути.`);
        cached = { ...FALLBACK };
        return cached;
    }
}

/**
 * @param {string} langDir
 */
function inferLang(langDir) {
    return path.basename(path.resolve(langDir));
}

/**
 * @param {string | number} lang
 */
function getGostSubdir(lang) {
    const paths = loadGostPaths();
    if (!paths[lang]) {
        throw new Error(
            `[gosts] В ${PATHS_FILE} нет пути для языка "${lang}". ` +
                `Добавьте строку "${lang}: <путь>". Сейчас есть: ${Object.keys(paths).join(', ')}.`
        );
    }
    return paths[lang];
}

/**
 * @param {string} langDir
 * @param {string} lang
 */
function getGostOutputDir(langDir, lang) {
    return path.join(langDir, getGostSubdir(lang || inferLang(langDir)));
}

/**
 * @param {string} lang
 */
function getGostOutputUrl(lang) {
    return `/${lang}/${getGostSubdir(lang)}/`;
}

function getGostLanguages() {
    return Object.keys(loadGostPaths());
}

module.exports = {
    loadGostPaths,
    getGostSubdir,
    getGostOutputDir,
    getGostOutputUrl,
    getGostLanguages,
    inferLang,
};
