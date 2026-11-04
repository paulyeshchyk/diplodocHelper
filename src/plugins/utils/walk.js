const { Fs_Walk_Directory } = require('./fs/Fs_Walk_Directory.ts');


/**
 * @deprecated Импортируйте `Fs_Walk_Directory` напрямую.
 *
 * Shim сохраняет **legacy-поведение**: `skipHidden: false` (исторический
 * `walk` не пропускал `.`-директории, что для `build/`-потребителей
 * безопасно, но неверно для `docs/`).
 *
 * Regression: 00.4.2#12, #13.
 * 
 * @param {any} dir
 * @param {any} filter
 * @param {any} callback
 */
function walk(dir, filter, callback) {
    Fs_Walk_Directory.walkSync({
        dir,
        skipHidden: false,
        filterFile: filter,
        onFile: callback,
    });
}

module.exports = { walk };