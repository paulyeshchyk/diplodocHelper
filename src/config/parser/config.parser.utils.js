/**
 * @param {string} type
 */
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
 * @param {string} type
 */
function normalizeType(type) {
    const t = type.toLowerCase();
    if (t.includes('boolean') || t === 'bool') return 'boolean';
    if (t.includes('number') || t.includes('int') || t.includes('float')) return 'number';
    if (t.includes('array')) return 'array';
    return 'string';
}

/**
 * Улучшенный парсинг значения по умолчанию
 * @param {string} valueStr
 * @param {string} type
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

/**
 * Парсит TypeScript-тип и возвращает { type, enumValues }
 * Примеры:
 *   'string'           -> { type: 'string', enumValues: null }
 *   'boolean'          -> { type: 'boolean', enumValues: null }
 *   'number'           -> { type: 'number', enumValues: null }
 *   "'ru' | 'en'"      -> { type: 'string', enumValues: ['ru', 'en'] }
 *   "'ru'|'en'"        -> то же самое
 *   'boolean | null'   -> { type: 'boolean', enumValues: null } (упрощённо)
 * @param {string} typeStr
 */
function parseTypeScriptType(typeStr) {
    const unionMatch = typeStr.match(/^'([^']+)'(\s*\|\s*'([^']+)')+$/);
    if (unionMatch) {
        // Извлекаем все строки в одинарных кавычках
        const enumValues = [];
        const regex = /'([^']+)'/g;
        let match;
        while ((match = regex.exec(typeStr)) !== null) {
            enumValues.push(match[1]);
        }
        return { type: 'string', enumValues };
    }

    // Простые типы
    const normalized = typeStr.toLowerCase();
    if (normalized.includes('boolean')) return { type: 'boolean', enumValues: undefined };
    if (normalized.includes('number')) return { type: 'number', enumValues: undefined };
    if (normalized.includes('array')) return { type: 'array', enumValues: undefined };
    return { type: 'string', enumValues: undefined };
}

/**
 * Очищает JSDoc-комментарий от /** и * и лишних пробелов
 * @param {string} comment
 */
function cleanJSDocComment(comment) {
    return comment
        .replace(/\/\*\*?/, '')
        .replace(/\*\//, '')
        .split('\n')
        .map(line => line.trim().replace(/^\*+\s?/, ''))
        .filter(line => line !== '')
        .join('\n');
}
module.exports = { getDefaultByType, normalizeType, parseDefaultValue, parseTypeScriptType, cleanJSDocComment };
