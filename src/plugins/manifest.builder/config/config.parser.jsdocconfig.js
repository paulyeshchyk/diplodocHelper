const { ConfigParserBase } = require('./config.parser.base');
const { normalizeType, getDefaultByType, parseDefaultValue } = require('./config.parser.utils');

class JsdocConfigParser extends ConfigParserBase {
    /**
     * @param {string} source
     * @param {string} typeDefName
     */
    parse(source, typeDefName) {
        this.properties = {};
        const typedefRegex = new RegExp(`\\/\\*\\*[\\s\\S]*?@typedef \\{Object\\} ${typeDefName}[\\s\\S]*?\\*\\/`, 'g');
        const typedefMatch = source.match(typedefRegex);
        if (!typedefMatch) {
            console.warn(`[JsdocConfigParser] Не найден @typedef {Object} ${typeDefName}`);
            return this.properties;
        }
        const block = typedefMatch[0];
        const propertyRegex = /@property \{([^}]+)\} (\w+)\s*([\s\S]*?)(?=@property\b|$)/g;
        let match;

        while ((match = propertyRegex.exec(block)) !== null) {
            const [, typeRaw, name, body] = match;
            const type = normalizeType(typeRaw.trim());
            let description = '';
            let defaultValue = getDefaultByType(type);
            /** @type {any[] | undefined} */
            let enumValues = [];
            let customOrder = null;

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
                } else if (line.startsWith('@order')) {
                    const orderStr = line.replace('@order', '').trim();
                    customOrder = parseInt(orderStr, 10);
                } else if (!line.startsWith('@')) {
                    description += (description ? ' ' : '') + line;
                }
            }

            this._addProperty(name, type, description, defaultValue, enumValues, customOrder);
        }
        return this._buildProperties();
    }
}

module.exports = { JsdocConfigParser };
