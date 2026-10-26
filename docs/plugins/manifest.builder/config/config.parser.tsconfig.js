const { ConfigParserBase } = require('./config.parser.base');
const { parseTypeScriptType, getDefaultByType, parseDefaultValue } = require('./config.parser.utils');

class TsConfigParser extends ConfigParserBase {
    /**
     * @param {string} source
     * @param {string} interfaceName
     */
    parse(source, interfaceName) {
        this.properties = {};
        const interfaceRegex = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
        const interfaceMatch = source.match(interfaceRegex);
        if (!interfaceMatch) {
            console.warn(`[TsConfigParser] Не найден интерфейс ${interfaceName}`);
            return this.properties;
        }
        const interfaceBody = interfaceMatch[1];
        const lines = interfaceBody.split('\n');
        let i = 0;
        let currentComment = '';

        while (i < lines.length) {
            const line = lines[i];
            if (line.trim().startsWith('/**')) {
                currentComment = line.trim();
                i++;
                while (i < lines.length && !lines[i].includes('*/')) {
                    currentComment += '\n' + lines[i];
                    i++;
                }
                if (i < lines.length && lines[i].includes('*/')) {
                    currentComment += '\n' + lines[i];
                    i++;
                }
                currentComment = this._cleanJSDocComment(currentComment);
                continue;
            }

            const propMatch = line.match(/^\s*(\w+)(\?)?\s*:\s*([^;]+);?/);
            if (propMatch) {
                 
                const [, name, optional, rawType] = propMatch;
                const typeStr = rawType.trim();

                // Получаем enumValues как переменную, которую можно перезаписывать
                const { type, enumValues: initialEnumValues } = parseTypeScriptType(typeStr);
                let enumValues = initialEnumValues;
                let defaultValue = getDefaultByType(type);
                let description = '';
                let customOrder = null;

                if (currentComment) {
                    const commentLines = currentComment.split('\n');
                    for (const cl of commentLines) {
                        if (cl.startsWith('@default')) {
                            const defValue = cl.replace('@default', '').trim();
                            defaultValue = parseDefaultValue(defValue, type);
                        } else if (cl.startsWith('@enum')) {
                            const enumRaw = cl.replace('@enum', '').trim();
                            const parts = enumRaw.split(',').map(s => s.trim());
                            if (parts.length) {
                                enumValues = parts; // безопасно перезаписываем
                            }
                        } else if (cl.startsWith('@order')) {
                            const orderStr = cl.replace('@order', '').trim();
                            customOrder = parseInt(orderStr, 10);
                        } else if (!cl.startsWith('@')) {
                            description += (description ? ' ' : '') + cl;
                        }
                    }
                }

                const inlineDefaultMatch = line.match(/\/\/\s*@default\s+(.+)$/);
                if (inlineDefaultMatch) {
                    defaultValue = parseDefaultValue(inlineDefaultMatch[1].trim(), type);
                }

                this._addProperty(name, type, description, defaultValue, enumValues, customOrder);
                currentComment = '';
            }
            i++;
        }
        return this._buildProperties();
    }
}

module.exports = { TsConfigParser };
