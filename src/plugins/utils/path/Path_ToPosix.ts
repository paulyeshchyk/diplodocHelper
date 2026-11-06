import * as path from 'node:path';

/**
 * Нормализация пути к forward slashes.
 *
 * Заменяет локальные `toPosix(p) { return p.split(path.sep).join('/'); }`
 * в `collect-catalog`, `emit-modules-table`, `build-page-legend`.
 *
 * ⚠️ Контракт — **native separator → `/`** через `path.sep`. Не заменяет
 * `\` в строках, где он не является разделителем (в отличие от
 * `.replace(/\\/g, '/')`). Для путей, полученных через `path.*`,
 * поведение эквивалентно. Для каталожных данных, сгенерированных
 * на другой ОС, — используйте `.replace(/\\/g, '/')` (не эта утилита).
 *
 * @example
 *   Path_ToPosix.convert('a/b/c')   === 'a/b/c'   // на POSIX: no-op
 *   Path_ToPosix.convert('a\\b\\c') === 'a/b/c'   // на Windows
 *   Path_ToPosix.convert('a//b')    === 'a//b'    // пустые сегменты сохраняются
 */
export class Path_ToPosix {
    static convert(p: string): string {
        return p.split(path.sep).join('/');
    }
}