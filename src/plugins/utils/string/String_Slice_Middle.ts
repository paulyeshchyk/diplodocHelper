/**
 * Обрезка строки по центру: `start + separator + end`.
 *
 * Единственный потребитель — `commands/vscode.message.builder.js`
 * (фича 40 / smart.delete → отрисовка списка ссылок).
 *
 * ⚠️ Контракт полностью совпадает с legacy `truncateMiddle`
 *    из `commands/diplodoc-helper.string.js`, включая вырожденный
 *    случай `maxLength < separator.length` (см. кейз 00.3.1#06):
 *    поведение намеренно сохранено для backward-compat.
 */
export class String_Slice_Middle {
    static truncate(text: string, maxLength: number = 52, separator: string = '...'): string {
        if (text.length <= maxLength) return text;

        const keep = Math.floor((maxLength - separator.length) / 2);
        return text.slice(0, keep) + separator + text.slice(-keep);
    }
}