const path = require('path');
const fs = require('fs');

/** @import {DiplodocConfig} from '../../config/model/diplodoc.config.model' */

/**
 * Конфигурация по умолчанию.
 * @returns {DiplodocConfig}
 */
function DefaultDiplodocConfig() {
    let result = {
        defaultLanguage: 'ru',
        figureCaptionPrefix: 'Рисунок',
        figureReferencePrefix: 'Рис.',
        figureReferenceCaptionPrefix: 'см. ',
        usePollingForContext: true,
        contextPollingInterval: 800,
    };
    return result;
}

/**
 * Загружает конфигурацию из JSON (строки или объекта).
 * @param {string | object | undefined} json
 * @returns {DiplodocConfig}
 */
function DiplodocConfigFromJson(json) {
    if (typeof json === 'string') {
        try {
            return JSON.parse(json);
        } catch (err) {
            let msg = err instanceof Error ? err.message : String(err);
            console.warn('Не удалось распарсить JSON:', msg);
        }
    } else if (json && typeof json === 'object') {
        return { ...DefaultDiplodocConfig(), ...json };
    }
    return DefaultDiplodocConfig();
}

/**
 * Сливает настройки из JSON-объекта в текущий конфиг (мутирует configObj).
 * @param {DiplodocConfig} configObj
 * @param {Record<string, any>} json
 * @param {string} CONFIG_KEY
 */
function mergeConfigFromJson(configObj, json, CONFIG_KEY) {
    const keyPrefix = `${CONFIG_KEY}.`;
    const overrides = {
        defaultLanguage: json[keyPrefix + 'defaultLanguage'],
        figureCaptionPrefix: json[keyPrefix + 'figureCaptionPrefix'],
        figureReferencePrefix: json[keyPrefix + 'figureReferencePrefix'],
    };

    let updated = false;
    for (const [field, value] of Object.entries(overrides)) {
        if (value !== undefined) {
            // @ts-ignore
            configObj[field] = value;
            updated = true;
        }
    }
    if (updated) {
        console.log('Настройки успешно загружены из локального .vscode/settings.json');
    }
}

/**
 * Загружает конфигурацию из workspace (через .vscode/settings.json).
 * @param {string} CONFIG_KEY
 * @returns {DiplodocConfig}
 */
function DiplodocConfigFromWorkspace(CONFIG_KEY) {
    const configObj = DefaultDiplodocConfig();
    const workspaceDir = process.env.WORKSPACE_DIR;

    if (workspaceDir) {
        const settingsPath = path.join(workspaceDir, '.vscode', 'settings.json');
        if (fs.existsSync(settingsPath)) {
            try {
                const raw = fs.readFileSync(settingsPath, 'utf8');
                const clean = raw.replace(/\/\/.*/g, '');
                const settings = JSON.parse(clean);
                mergeConfigFromJson(configObj, settings, CONFIG_KEY);
            } catch (err) {
                let msg = err instanceof Error ? err.message : String(err);
                console.warn('Не удалось прочитать .vscode/settings.json, используем значения по умолчанию:', msg);
            }
        }
    }
    return configObj;
}

/**
 * Финальная сборка конфигурации с учётом переменных окружения CLI.
 * @param {string} CONFIG_KEY
 * @returns {{ targetLocale: string; configObj: DiplodocConfig }}
 */
function DiplodocConfigFromCli(CONFIG_KEY) {
    // 1. Базовая конфигурация из workspace
    /**@type {DiplodocConfig} */
    let configObj = DiplodocConfigFromWorkspace(CONFIG_KEY);
    let targetLocale = configObj.defaultLanguage;

    // 2. Переопределение через CLI_LOCALE
    if (process.env.CLI_LOCALE) {
        targetLocale = process.env.CLI_LOCALE;
    }

    // 3. Полная замена конфига через CLI_CONFIG (если передан валидный JSON)
    if (process.env.CLI_CONFIG) {
        const cliConfig = DiplodocConfigFromJson(process.env.CLI_CONFIG);
        // Заменяем только если парсинг удался и вернулся объект (не дефолт? можно всегда заменять)
        configObj = cliConfig;
        // При необходимости targetLocale можно синхронизировать с новым конфигом
        if (configObj.defaultLanguage && !process.env.CLI_LOCALE) {
            targetLocale = configObj.defaultLanguage;
        }
    }

    return { targetLocale, configObj };
}

/**
 * @param {{ get: (arg0: string | symbol) => any; }} rawConfig
 */
function DiplodocConfigProxy(rawConfig) {
    return new Proxy(
        {},
        {
            get(_, prop) {
                return rawConfig.get(prop);
            },
        }
    );
}

module.exports = {
    DefaultDiplodocConfig,
    DiplodocConfigFromJson,
    DiplodocConfigFromWorkspace,
    DiplodocConfigFromCli,
    DiplodocConfigProxy,
};
