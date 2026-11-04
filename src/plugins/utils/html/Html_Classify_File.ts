import * as path from 'node:path';

/**
 * Классификация HTML-файлов в дереве сборки.
 *
 * Единственная точка правды для `isHtmlFile` / `isRootIndex`.
 * Legacy-копия в `plugins/utils/html.utils.js` превращается в shim
 * (см. consumer-миграцию) — её поведение полностью воспроизведено здесь,
 * включая строгость `isRootIndex` к точному `index.html` (не `.HTM`, не `INDEX.HTML`).
 */
export class Html_Classify_File {
    /**
     * Регистро-независимая проверка расширения `.html`.
     * Не ловит `.htm` (в legacy не ловилось).
     *
     * @example
     *   Html_Classify_File.isHtmlFile('a.html')  // true
     *   Html_Classify_File.isHtmlFile('a.HTML')  // true
     *   Html_Classify_File.isHtmlFile('a.htm')   // false
     */
    static isHtmlFile(filePath: string): boolean {
        return filePath.toLowerCase().endsWith('.html');
    }

    /**
     * Проверяет, что файл — корневой `index.html` самой папки сборки.
     * Сравнение по dirname строгое — `buildDir` должен быть уже нормализован
     * (`path.resolve`), что гарантируют все текущие потребители.
     *
     * @example
     *   Html_Classify_File.isRootIndex('/repo/build', '/repo/build/index.html')  // true
     *   Html_Classify_File.isRootIndex('/repo/build', '/repo/build/ru/index.html') // false
     */
    static isRootIndex(buildDir: string, htmlPath: string): boolean {
        return path.basename(htmlPath) === 'index.html' && path.dirname(htmlPath) === buildDir;
    }
}