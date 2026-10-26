/**
 * @param {string} attrs
 * @param {any} styleDecl
 * @param {any} isJson
 */
function upsertStyle(attrs, styleDecl, isJson) {
    if (isJson) {
        const re = /\bstyle=\\"([^"\\]*(?:\\.[^"\\]*)*)\\"/;
        if (re.test(attrs)) {
            return attrs.replace(re, (/** @type {any} */ m, /** @type {string} */ existing) => {
                const cleaned = existing
                    .replace(/counter-reset\s*:[^;]*;?/g, '')
                    .replace(/;\s*;+/g, ';')
                    .trim();
                const sep = cleaned && !cleaned.endsWith(';') ? '; ' : '';
                return `style=\\"${cleaned}${sep}${styleDecl}\\"`;
            });
        }
        return attrs + ` style=\\"${styleDecl}\\"`;
    }

    const re = /\bstyle="([^"]*)"/;
    if (re.test(attrs)) {
        return attrs.replace(re, (/** @type {any} */ m, /** @type {string} */ existing) => {
            const cleaned = existing
                .replace(/counter-reset\s*:[^;]*;?/g, '')
                .replace(/;\s*;+/g, ';')
                .trim();
            const sep = cleaned && !cleaned.endsWith(';') ? '; ' : '';
            return `style="${cleaned}${sep}${styleDecl}"`;
        });
    }
    return attrs + ` style="${styleDecl}"`;
}

module.exports = {
    upsertStyle,
};
