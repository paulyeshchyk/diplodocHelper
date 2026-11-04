export type InlineAnnotationTagName = 'abbr';

export interface InlineAnnotationRange {
    /** Смещение открывающего `<` в тексте. */
    startOffset: number;
    /** Смещение после закрывающего `>`. */
    endOffset: number;
    /** Тримленное содержимое между `>` и `</tagName>`. */
    inner: string;
}

/**
 * Поиск inline-аннотации (`<abbr>…</abbr>`) вокруг офсета.
 *
 * Потребители:
 *   - `abbrs.textRange.findAbbrAroundOffset` (обёртка парсит `data-abbr`);
 *   - `terms.textRange.findTermAroundOffset` (обёртка парсит `data-term` + class).
 *
 * ⚠️ Семантика edge-cases (унаследована от legacy):
 *   - `offset` ровно на `<` открывающего тега → null
 *     (см. `openEnd >= offset`);
 *   - `offset` ровно на `>` открывающего тега → null (то же условие);
 *   - `offset` сразу после `>` открывающего тега → null, если `inner` пуст
 *     (innerStart === innerEnd) или если inner.trim() === '';
 *   - вложенность не поддерживается: nearest preceding `<abbr` + nearest
 *     following `</abbr>`; для `<abbr><abbr>x</abbr></abbr>` ищем от
 *     последнего `<abbr` слева;
 *   - если между `<abbr` и offset есть `</abbr>` → возвращаем null
 *     (значит offset уже вне тега, ближайший тег закрылся раньше).
 *
 * @returns диапазон или `null`, если offset вне валидного `<abbr>…</abbr>`.
 */
export class InlineAnnotation_TextRange {
    static findAroundOffset(
        text: string,
        offset: number,
        tagName: InlineAnnotationTagName,
    ): InlineAnnotationRange | null {
        if (offset < 0 || offset > text.length) return null;
        // defensive: на случай вызова из plain JS с пустой строкой
        // (legacy возвращал null; union-тип такого вызова не пропустит)
        if (!tagName) return null;

        const openTag = `<${tagName}`;
        const closeTag = `</${tagName}>`;
        const closeRe = new RegExp(`</${tagName}>`, 'i');

        const lastOpen = text.lastIndexOf(openTag, offset);
        if (lastOpen === -1) return null;

        const between = text.substring(lastOpen, offset);
        if (closeRe.test(between)) return null;

        const after = text.substring(offset);
        const closeMatch = after.match(closeRe);
        if (!closeMatch) return null;

        const openEnd = text.indexOf('>', lastOpen);
        if (openEnd === -1 || openEnd >= offset) return null;

        const innerStart = openEnd + 1;
        const innerEnd = offset + (closeMatch.index ?? 0);
        const inner = text.substring(innerStart, innerEnd).trim();
        if (!inner) return null;

        return {
            startOffset: lastOpen,
            endOffset: innerEnd + closeTag.length,
            inner,
        };
    }
}