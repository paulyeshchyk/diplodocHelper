import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WalkOptions {
    /** Корень обхода (абсолютный или относительный). */
    dir: string;
    /** Пропускать директории и файлы с префиксом `.`. По умолчанию `true`. */
    skipHidden?: boolean;
    /** Пропускать директории с префиксом `_`. По умолчанию `false`. */
    skipUnderscore?: boolean;
    /** Пропускать директории по basename (напр. `node_modules`, `contexts`). */
    skipDirNames?: ReadonlySet<string>;
    /**
     * Пропускать директории по абсолютному пути.
     * Сравнение через `path.resolve` — значения в сете должны быть уже нормализованы
     * (как их отдают `getAbbrOutputDir` / `getTermOutputDir` / `getGostOutputDir`).
     */
    skipFullPaths?: ReadonlySet<string>;
    /** Фильтр для файлов (по полному пути). Если не задан — все файлы попадают в `onFile`. */
    filterFile?: (fullPath: string) => boolean;
    /** Колбэк для каждого файла, прошедшего фильтр. */
    onFile: (fullPath: string) => void;
}

/**
 * Рекурсивный обход дерева с настраиваемыми skip-правилами.
 *
 * Заменяет:
 *   - `plugins/utils/walk.js` (shim сохраняет legacy-поведение `skipHidden=false`);
 *   - локальные `walk`-реализации в `abbrs/terms/figures/gosts/…` коллекторах
 *     (переводятся на прямой вызов отдельными волнами).
 *
 * Гарантии:
 *   - не следует по symlink-ам (`entry.isDirectory()` для симлинка = false,
 *     т.к. `withFileTypes` возвращает тип цели);
 *   - молча no-op для несуществующей `dir`;
 *   - порядок обхода не определён (зависит от `readdirSync`) — потребители
 *     не должны полагаться на него.
 */
export class Fs_Walk_Directory {
    static walkSync(options: WalkOptions): void {
        if (!fs.existsSync(options.dir)) return;
        Fs_Walk_Directory._walk(options.dir, options);
    }

    /**
     * Собирает список файлов в массив.
     * Эквивалент `walkSync` с `onFile: (p) => result.push(p)`.
     */
    static collectFiles(options: Omit<WalkOptions, 'onFile'>): string[] {
        const result: string[] = [];
        Fs_Walk_Directory.walkSync({
            ...options,
            onFile: p => result.push(p),
        });
        return result;
    }

    private static _walk(dir: string, options: WalkOptions): void {
        const skipHidden = options.skipHidden ?? true;
        const skipUnderscore = options.skipUnderscore ?? false;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (skipHidden && entry.name.startsWith('.')) continue;
                if (skipUnderscore && entry.name.startsWith('_')) continue;
                if (options.skipDirNames?.has(entry.name)) continue;
                if (options.skipFullPaths?.has(path.resolve(fullPath))) continue;
                Fs_Walk_Directory._walk(fullPath, options);
            } else if (options.filterFile ? options.filterFile(fullPath) : true) {
                options.onFile(fullPath);
            }
        }
    }
}