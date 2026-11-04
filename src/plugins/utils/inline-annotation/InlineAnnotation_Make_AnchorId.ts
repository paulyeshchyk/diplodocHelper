import { slugify_latin_alphanumeric } from '../encoding.slugify';

export type InlineAnnotationPrefix = 'abbr' | 'term';

/**
 * Идентификаторы аннотаций для якорей и вхождений.
 *
 * Историческое имя файла: `shared/inlineAnnotation.model.js`
 * (функции `makeAnchorId`, `makeOccurrenceId`).
 *
 * Схема:
 *   - anchor: `<prefix>-<slug(name)>`          — стабильный якорь на странице-указателе;
 *   - occurrence: `<anchor>-<n>`                — конкретное вхождение в тексте.
 *
 * `n` в `makeOccurrenceId` **не приводится** к числу — контракт совпадает
 * с legacy (`${n}` → строковая интерполяция). Передавать `1`, а не `'1'`,
 * но `'1'` тоже работает и даёт тот же результат.
 */
export class InlineAnnotation_Make_AnchorId {
    static makeAnchorId(prefix: InlineAnnotationPrefix, name: string): string {
        return `${prefix}-${slugify_latin_alphanumeric(name)}`;
    }

    static makeOccurrenceId(prefix: InlineAnnotationPrefix, name: string, n: number | string): string {
        return `${InlineAnnotation_Make_AnchorId.makeAnchorId(prefix, name)}-${n}`;
    }
}