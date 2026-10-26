// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const possiblePaths = [
    path.join(__dirname, 'abbrs.paths.yaml'),
    path.join(__dirname, '..', '..', 'src', 'plugins', 'abbrs', 'abbrs.paths.yaml'),
    path.join(process.cwd(), 'src', 'plugins', 'abbrs', 'abbrs.paths.yaml'),
];
const PATHS_FILE = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

// Значения по умолчанию — используются, если YAML отсутствует/битый.
const FALLBACK = {
    ru: 'Дополнительнаяинформация/Списоксокращений',
    en: 'Additional information/List of abbreviations',
};

let cached = null;

/**
 * Нормализует подпуть: trim, прямые слэши, без ведущего/хвостового «/».
 * @param {string} value
 * @returns {string}
 */
function normalizeSubdir(value) {
    return String(value)
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
}

/**
 * Загружает карту { lang: subdir } из abbrs.paths.yaml (с кешем).
 * @returns {Record<string, string>}
 */
function loadAbbrPaths() {
    if (cached) return cached;

    if (!fs.existsSync(PATHS_FILE)) {
        console.warn(`[abbrs] ${PATHS_FILE} не найден — использую встроенные пути.`);
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
                console.warn(`[abbrs] ${PATHS_FILE}: пропущен язык "${lang}" (пустой путь).`);
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
        console.warn(`[abbrs] Ошибка чтения ${PATHS_FILE}: ${msg} — использую встроенные пути.`);
        cached = { ...FALLBACK };
        return cached;
    }
}

/**
 * @param {string} langDir
 * @returns {string} basename без завершающего слэша
 */
function inferLang(langDir) {
    return path.basename(path.resolve(langDir));
}

/**
 * @param {string} lang
 * @returns {string} нормализованный подпуть для языка
 */
function getAbbrSubdir(lang) {
    const paths = loadAbbrPaths();
    if (!paths[lang]) {
        throw new Error(
            `[abbrs] В ${PATHS_FILE} нет пути для языка "${lang}". ` +
                `Добавьте строку "${lang}: <путь>". Сейчас есть: ${Object.keys(paths).join(', ')}.`
        );
    }
    return paths[lang];
}

/**
 * @param {string} langDir
 * @param {string} [lang] — если не задан, берётся basename(langDir)
 * @returns {string} абсолютный путь к папке артефактов
 */
function getAbbrOutputDir(langDir, lang) {
    return path.join(langDir, getAbbrSubdir(lang || inferLang(langDir)));
}

/**
 * @param {string} lang
 * @returns {string} URL-префикс для ссылок «см. Аббревиатуры»
 */
function getAbbrOutputUrl(lang) {
    return `/${lang}/${getAbbrSubdir(lang)}/`;
}

/**
 * @returns {string[]} список языков из YAML (порядок сохраняется)
 */
function getAbbrLanguages() {
    return Object.keys(loadAbbrPaths());
}

module.exports = {
    loadAbbrPaths,
    getAbbrSubdir,
    getAbbrOutputDir,
    getAbbrOutputUrl,
    getAbbrLanguages,
    inferLang,
};
