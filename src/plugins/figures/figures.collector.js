// @ts-nocheck
const { Fs_Walk_Directory } = require('../utils/fs/Fs_Walk_Directory.ts');
const { extractFiguresFromFile } = require('./figures.extractor');

/** @typedef {import('./figures.types.ts').FigureList} FigureList */

// Чтобы не зациклиться и не тащить служебные страницы
const SKIP_DIRS = new Set(['figures', 'contexts', 'helptags']);

/**
 * Собирает все рисунки из `.md`-файлов `langDir`.
 *
 * Асимметрии к другим коллекторам (см. 5a/5c):
 *   - ходит в `.` и `_` (skipHidden: false, skipUnderscore: false) —
 *     как `helptags` и `contexts`;
 *   - `SKIP_DIRS` содержит только `figures`, `contexts`, `helptags` —
 *     `abbrs`, `terms`, `roadmap` **обходятся** (в них тоже бывают рисунки);
 *   - нет `skipFullPaths`: `figures/` исключается по basename, отдельного
 *     `path.resolve` нет.
 *
 * @param {string} langDir
 * @returns {FigureList}
 */
function walkMdFilesGetFigures(langDir) {
    /** @type {FigureList} */
    const figures = [];

    Fs_Walk_Directory.walkSync({
        dir: langDir,
        skipHidden: false,
        skipUnderscore: false,
        skipDirNames: SKIP_DIRS,
        filterFile: fullPath => fullPath.endsWith('.md'),
        onFile: fullPath => {
            try {
                figures.push(...extractFiguresFromFile(fullPath, langDir));
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`❌ [Figures] Ошибка обработки ${fullPath}:`, msg);
            }
        },
    });

    return figures;
}

module.exports = { walkMdFilesGetFigures };
