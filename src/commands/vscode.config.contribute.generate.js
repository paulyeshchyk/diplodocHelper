// src/commands/vscode.config.contribute.generate.js
const fs = require('fs');
const path = require('path');

/**
 * Генерирует contributes.configuration на основе конфигурационного объекта
 *
 * @param {Object} config
 * @param {string} config.modelPath - относительный путь к файлу модели
 * @param {string} config.typeDefName - имя типа (например 'DiplodocConfig')
 * @param {string} config.settingPrefix - префикс настроек (например 'diplodoc-helper')
 * @param {string} [config.title="Diplodoc Helper"] - заголовок секции настроек
 * @returns {{ contributes: { configuration: Object } }}
 */
function generateConfigurationContribute(config) {
    const { modelPath, typeDefName, settingPrefix, title = 'Diplodoc Helper' } = config;

    const fullModelPath = path.resolve(__dirname, modelPath);
    const source = fs.readFileSync(fullModelPath, 'utf8');

    const properties = parseDiplodocConfigTypedef(source, typeDefName, settingPrefix);

    return {
        contributes: {
            configuration: {
                title,
                properties,
            },
        },
    };
}

// src/commands/vscode.config.contribute.generate.js

/**
 * Универсальный парсер JSDoc @typedef для генерации VS Code configuration
 *
 * @param {string} source - содержимое JS-файла с JSDoc
 * @param {string} typeDefName - имя типа, например "DiplodocConfig"
 * @param {string} settingPrefix - префикс настроек, например "diplodoc-helper"
 * @returns {Object} - объект properties для contributes.configuration
 */
function parseDiplodocConfigTypedef(source, typeDefName, settingPrefix) {
    const properties = {};

    // Находим блок @typedef {Object} TypeName
    const typedefRegex = new RegExp(`\\/\\*\\*[\\s\\S]*?@typedef \\{Object\\} ${typeDefName}[\\s\\S]*?\\*\\/`, 'g');
    const typedefMatch = source.match(typedefRegex);

    if (!typedefMatch) {
        console.warn(`[@config] Не найден @typedef {Object} ${typeDefName}`);
        return properties;
    }

    const block = typedefMatch[0];

    // Парсим свойства
    const propertyRegex = /@property \{([^}]+)\} (\w+)\s*([\s\S]*?)(?=@property\b|$)/g;
    let match;

    while ((match = propertyRegex.exec(block)) !== null) {
        const [, typeRaw, name, body] = match;

        const type = normalizeType(typeRaw.trim());
        let description = '';
        let defaultValue = getDefaultByType(type);
        let enumValues = null;

        const lines = body
            .split('\n')
            .map(line => line.trim().replace(/^\*+\s?/, ''))
            .filter(Boolean);

        for (const line of lines) {
            if (line.startsWith('@default')) {
                const value = line.replace('@default', '').trim();
                defaultValue = parseDefaultValue(value, type);
            } else if (line.startsWith('@enum')) {
                enumValues = line
                    .replace('@enum', '')
                    .trim()
                    .split(',')
                    .map(s => s.trim());
            } else if (!line.startsWith('@')) {
                description += (description ? ' ' : '') + line;
            }
        }

        const settingKey = `${settingPrefix}.${name}`;

        properties[settingKey] = {
            type,
            default: defaultValue,
            description: description.trim() || `Настройка ${name}`,
            order: Object.keys(properties).length * 10 + 10,
        };

        if (enumValues && enumValues.length > 0) {
            properties[settingKey].enum = enumValues;
        }
    }

    return properties;
}

function normalizeType(type) {
    const t = type.toLowerCase();
    if (t.includes('boolean') || t === 'bool') return 'boolean';
    if (t.includes('number') || t.includes('int') || t.includes('float')) return 'number';
    if (t.includes('array')) return 'array';
    return 'string';
}

function getDefaultByType(type) {
    switch (type) {
        case 'boolean':
            return true;
        case 'number':
            return 0;
        case 'array':
            return [];
        default:
            return '';
    }
}

/**
 * Улучшенный парсинг значения по умолчанию
 */
function parseDefaultValue(valueStr, type) {
    if (!valueStr) return getDefaultByType(type);

    if (type === 'boolean') {
        return valueStr.toLowerCase() === 'true';
    }

    if (type === 'number') {
        const num = Number(valueStr);
        return isNaN(num) ? 0 : num;
    }

    // Для строк — возвращаем как есть (включая %плейсхолдеры%)
    // Убираем лишние кавычки, если пользователь их поставил
    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
        return valueStr.slice(1, -1);
    }
    if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
        return valueStr.slice(1, -1);
    }

    return valueStr;
}

module.exports = {
    generateConfigurationContribute,
};
