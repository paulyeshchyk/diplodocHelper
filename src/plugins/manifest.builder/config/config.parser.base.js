/**
 * Базовый класс для парсеров конфигурации
 */
class ConfigParserBase {
    /**
     * @param {string} settingPrefix - префикс для ключей настроек
     */
    constructor(settingPrefix) {
        this.settingPrefix = settingPrefix;
        /** @type {Array<{name: string, type: string, description: string, defaultValue: any, enumValues?: any[], order: number}>} */
        this._items = [];
    }

    /**
     * Основной метод парсинга – должен быть переопределён в наследниках
     * @param {string} source
     * @param {string} typeName
     * @returns {Record<string, any>}
     */
    // eslint-disable-next-line no-unused-vars
    parse(source, typeName) {
        throw new Error('Method parse() must be implemented in subclass');
    }

    /**
     * Добавляет свойство во внутренний массив.
     * @protected
     * @param {string} name
     * @param {string} type
     * @param {string} description
     * @param {any} defaultValue
     * @param {any[] | undefined} [enumValues]   // изменено: null → undefined
     * @param {number | null} [customOrder] - явный порядок (из @order)
     */
    _addProperty(name, type, description, defaultValue, enumValues = undefined, customOrder = null) {
        const order =
            customOrder !== null && Number.isInteger(customOrder) ? customOrder : (this._items.length + 1) * 10;
        this._items.push({
            name,
            type,
            description,
            defaultValue,
            enumValues,
            order,
        });
    }

    /**
     * Сортирует накопленные элементы по order и возвращает итоговый объект properties.
     * @protected
     * @returns {Record<string, any>}
     */
    _buildProperties() {
        const sorted = [...this._items].sort((a, b) => a.order - b.order);
        /** @type {Record<string, any>} */ // явная аннотация типа
        const properties = {};
        for (const item of sorted) {
            const key = `${this.settingPrefix}.${item.name}`;
            properties[key] = {
                type: item.type,
                default: item.defaultValue,
                description: item.description.trim() || `Настройка ${item.name}`,
                order: item.order,
            };
            if (item.enumValues && item.enumValues.length) {
                properties[key].enum = item.enumValues;
            }
        }
        return properties;
    }

    /**
     * Нормализует JSDoc-строку (убирает /** *\/ и лишние звёздочки)
     * @param {string} comment
     * @returns {string}
     */
    _cleanJSDocComment(comment) {
        return comment
            .replace(/\/\*\*?/, '')
            .replace(/\*\//, '')
            .split('\n')
            .map(line => line.trim().replace(/^\*+\s?/, ''))
            .filter(line => line !== '')
            .join('\n');
    }
}

module.exports = { ConfigParserBase };
