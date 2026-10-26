const fs = require('fs');
const path = require('node:path');

/**
 * Рекурсивный обход директории с фильтром
 * @param {string} dir
 * @param {(fullPath: string, entry: fs.Dirent) => boolean} filter
 * @param {(fullPath: string) => void} callback
 */
function walk(dir, filter, callback) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath, filter, callback);
        } else if (filter(fullPath, entry)) {
            callback(fullPath);
        }
    }
}

module.exports = {
    walk,
};
