// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Умный поиск файла конфигурации:
// 1. Рядом с текущим файлом (если запускаем без сборки)
// 2. В папке src (если запускаем из dist/)
const possiblePaths = [
    path.join(__dirname, 'terms.paths.yaml'),
    path.join(__dirname, '..', '..', 'src', 'plugins', 'terms', 'terms.paths.yaml'),
    path.join(process.cwd(), 'src', 'plugins', 'terms', 'terms.paths.yaml'),
];
const PATHS_FILE = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

const FALLBACK = {
    ru: 'Дополнительнаяинформация/Терминыиопределения',
    en: 'Additional information/Terms and definitions',
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

function loadTermPaths() {
    if (cached) return cached;

    if (!fs.existsSync(PATHS_FILE)) {
        console.warn(`[terms] ${PATHS_FILE} не найден — использую встроенные пути.`);
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
                console.warn(`[terms] ${PATHS_FILE}: пропущен язык "${lang}" (пустой путь).`);
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
        console.warn(`[terms] Ошибка чтения ${PATHS_FILE}: ${msg} — использую встроенные пути.`);
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
function getTermSubdir(lang) {
    const paths = loadTermPaths();
    if (!paths[lang]) {
        throw new Error(
            `[terms] В ${PATHS_FILE} нет пути для языка "${lang}". ` +
                `Добавьте строку "${lang}: <путь>". Сейчас есть: ${Object.keys(paths).join(', ')}.`
        );
    }
    return paths[lang];
}

/**
 * @param {string} langDir
 * @param {string} lang
 */
function getTermOutputDir(langDir, lang) {
    return path.join(langDir, getTermSubdir(lang || inferLang(langDir)));
}

/**
 * @param {string} lang
 */
function getTermOutputUrl(lang) {
    return `/${lang}/${getTermSubdir(lang)}/`;
}

function getTermLanguages() {
    return Object.keys(loadTermPaths());
}

module.exports = {
    loadTermPaths,
    getTermSubdir,
    getTermOutputDir,
    getTermOutputUrl,
    getTermLanguages,
    inferLang,
};
