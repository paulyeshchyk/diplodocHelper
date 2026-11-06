import * as fs from 'node:fs';
import * as path from 'node:path';
import { Path_ToPosix } from '../path/Path_ToPosix.ts';
import { Fs_Walk_Directory } from './Fs_Walk_Directory.ts';

export interface FindModuleDirsOptions {
    /** Корень обхода (обычно `<docsDir>/<lang>/<modulesFolder>`). */
    rootDir: string;

    /**
     * Префикс папки-модуля.
     *
     * - `undefined` / `null` / `''` → все подпапки с `indexFileName` считаются
     *   модулями (при условии, что не в `excludeDirs`).
     * - Непустая строка → `matchModuleDir(name, prefix)`.
     *
     * Пример: для дефолтного проекта — `'Модуль'`; для буклетов — `undefined`.
     */
    prefix?: string | null;

    /**
     * Директории, которые нужно исключить из результата.
     *
     * Значения — posix-style пути относительно `rootDir` (или абсолютные).
     * Обычно — `dimensions.<dim>.items.<slug>.dir` (страницы измерений:
     * у них тоже есть `index.md`, но это не модули).
     *
     * Сравнение: `Path_ToPosix.convert(path.relative(rootDir, dirPath))` ∈ `excludeDirs`.
     */
    excludeDirs?: ReadonlySet<string>;

    skipDirNames?: ReadonlySet<string>;
    skipFullPaths?: ReadonlySet<string>;
    skipHidden?: boolean;
    skipUnderscore?: boolean;
    indexFileName?: string;
}

export class Fs_Find_Module_Dirs {


    /**
     * Проверяет соответствие имени папки префиксу `prefix`.
     *
     * Правила:
     *   - точное совпадение с `prefix` — `true`;
     *   - `prefix` **оканчивается на не-букву** (цифра, `_`, `-`, `.`,
     *     пробел) — это явный разделитель, суффикс может быть любым:
     *     `Phone_iPhone15`, `Model-15`, `2024_1` — `true`;
     *   - `prefix` **оканчивается на букву** — legacy-проверка:
     *     первый символ суффикса ∈ `[A-ZА-ЯЁ0-9 _\-.]`
     *     (`МодульCLI`, `Модуль 1` — `true`; `Модульa` — `false`);
     *   - `prefix` в середине строки — `false`.
     */
    static matchModuleDir(name: string, prefix: string): boolean {
        const n = name.trim();
        if (!n.startsWith(prefix)) return false;
        const after = n.slice(prefix.length);
        if (after === '') return true;

        // Prefix оканчивается на не-букву → явный разделитель, суффикс любой.
        const lastPrefixChar = prefix.slice(-1);
        if (!/[A-Za-zА-Яа-яЁё]/.test(lastPrefixChar)) return true;

        // Legacy: prefix оканчивается на букву → требуем верхний/цифру/символ.
        return /^[A-ZА-ЯЁ0-9 _\-.]/.test(after);
    }


    static findSync(opts: FindModuleDirsOptions): string[] {
        const indexFile = opts.indexFileName ?? 'index.md';
        const hasPrefix = typeof opts.prefix === 'string' && opts.prefix.length > 0;
        const exclude = opts.excludeDirs;

        const found: string[] = [];

        Fs_Walk_Directory.walkSync({
            dir: opts.rootDir,
            skipHidden: opts.skipHidden ?? false,
            skipUnderscore: opts.skipUnderscore ?? false,
            skipDirNames: opts.skipDirNames,
            skipFullPaths: opts.skipFullPaths,
            onDirectory: dirPath => {
                if (hasPrefix) {
                    const name = path.basename(dirPath);
                    if (!Fs_Find_Module_Dirs.matchModuleDir(name, opts.prefix!)) return;
                }

                if (exclude && exclude.size > 0) {
                    const relPosix = Path_ToPosix.convert(path.relative(opts.rootDir, dirPath));
                    if (exclude.has(relPosix) || exclude.has(dirPath)) return;
                }

                if (fs.existsSync(path.join(dirPath, indexFile))) {
                    found.push(dirPath);
                }
            },
            onFile: () => { },
        });

        return found;
    }
}