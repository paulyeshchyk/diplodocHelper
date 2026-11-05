import { String_Transliterate_Cyrillic } from '../string/String_Transliterate_Cyrillic.ts';

/**
 * Трансформация текста в URL-safe «сегмент»:
 * `[a-z0-9_]+`, lowercase, без ведущих/хвостовых `_`.
 *
 * Историческое имя: `slugify_latin_alphanumeric` из `utils/encoding.slugify.js`.
 *
 * Используется для генерации **стабильных идентификаторов** (id, anchor, имя файла):
 *   - `InlineAnnotation_Make_AnchorId` → `term-${slug}`, `abbr-${slug}`;
 *   - `md.links.figure.buildFigureId` → `fig-${slug}`;
 *   - `gosts.injector` → `gost-${slug}`.
 *
 * Правила:
 *   1. `String_Transliterate_Cyrillic.toLatin` — кириллица → латиница + lowercase;
 *      `ь`/`ъ` и другие символы вне карты «протекают» как есть;
 *   2. всё вне `[a-z0-9]` → `_` (группа `+` схлопывается в один `_`);
 *   3. trim ведущих и хвостовых `_`.
 *
 * Примеры ь/ъ (важно: middle → separator, trailing → trim):
 *   - `'жизнь'`  → `'zhizn'`   (trailing ь → '_' → trim);
 *   - `'солью'`  → `'sol_yu'`  (ь в середине → '_');
 *   - `'объект'` → `'ob_ekt'`  (ъ в середине → '_');
 *   - `'ь'`/`'ъ'` → `''`       (весь вход = только сепаратор). 
 *
 * `toLatin` уже делает `.toLowerCase()`, поэтому отдельный lowercase здесь
 * избыточен и намеренно не дублируется (см. 00.6.2#11).
 *
 * Пограничные случаи:
 *   - `''`, `null`, `undefined`, числа, объекты → `''`;
 *   - `'0'` (строка) → `'0'` (не пусто, число как строка допустимо);
 *   - строка только из спецсимволов/`_` → `''`;
 *   - emoji → `''` (не `[a-z0-9]`, вырезается).
 */
export class Url_Transform_Segment {
    /**
     * @example
     *   Url_Transform_Segment.slugify('Привет Мир')   === 'privet_mir'
     *   Url_Transform_Segment.slugify('API v2')       === 'api_v2'
     *   Url_Transform_Segment.slugify('ГОСТ 11371-78') === 'gost_11371_78'
     *   Url_Transform_Segment.slugify('жизнь')        === 'zhizn'
     *   Url_Transform_Segment.slugify(null)           === ''
     */
    static slugify(text: unknown): string {
        if (!text || typeof text !== 'string') return '';

        const transliterated = String_Transliterate_Cyrillic.toLatin(text);
        return transliterated
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}