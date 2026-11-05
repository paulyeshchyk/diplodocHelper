import { String_Transliterate_Cyrillic } from '../string/String_Transliterate_Cyrillic';

/**
 * Slug для anchor'ов в Markdown-ссылках (`#my-heading`).
 *
 * Историческое имя: `slugify_diplodoc_reference` из `utils/encoding.slugify.js`,
 * а также локальные `generateSlug` в `commands/diplodoc-helper.link.Paste.js`
 * и `utils/link.utils.js` (обе копии были идентичны).
 *
 * Отличия от `Url_Transform_Segment.slugify` (B-2, `slugify_latin_alphanumeric`):
 *   - разделитель `-` (не `_`);
 *   - сохраняет `/`, `=`, `\` в дополнение к `[a-z0-9]`;
 *   - **не делает trim** — trailing `-` может остаться (см. ниже);
 *   - предварительно удаляет Markdown-префикс `^#+\s*`
 *     (`'### Header'` → `'header'`).
 *
 * Правила:
 *   1. `String_Transliterate_Cyrillic.toLatin(text)` — кириллица → латиница + lowercase;
 *   2. `^#+\s*` — удалить markdown-префикс заголовка;
 *   3. `.toLowerCase()` — noop после toLatin, оставлен для читаемости;
 *   4. `\s+` → `-` (пробелы → дефис);
 *   5. `[^a-z0-9/=\\ -]` → удалить (сохранить `a-z0-9`, `/`, `=`, `\`, `-`, ` `);
 *   6. `-+` → `-` (collapse дефисов).
 *
 * ⚠️ Edge-cases (зафиксированы frozen-снапшотом):
 *   - **`'### Header ###'` → `'header-'`** — trailing `#` после collapse
 *     дают trailing `-`; legacy `#`-префикс убирал только ведущий `###`,
 *     а `trim` не делался. На практике не проявляется, потому что
 *     `extractAnchorsFromMdFile` уже trim'ит `title` перед вызовом;
 *   - **`'# Header\n'` → `'header-'`** — trailing newline → `\s+` → `-`;
 *     по той же причине не проявляется;
 *   - **`'Text#anchor'` → `'textanchor'`** — `#` в середине попадает
 *     под `[^...]` и удаляется без замены на `-`;
 *   - **`'#'`** (только префикс) → `''` — `cleanText` пустой.
 */
export class Url_Transform_Reference {
    /**
     * @example
     *   Url_Transform_Reference.slugify('## Multi Word Header')  === 'multi-word-header'
     *   Url_Transform_Reference.slugify('# Привет Мир')          === 'privet-mir'
     *   Url_Transform_Reference.slugify('a/b/c')                 === 'a/b/c'
     *   Url_Transform_Reference.slugify('a=b')                   === 'a=b'
     *   Url_Transform_Reference.slugify(null)                    === ''
     */
    static slugify(text: unknown): string {
        if (typeof text !== 'string') return '';

        const cleanText = text.replace(/^#+\s*/, '');
        const transliterated = String_Transliterate_Cyrillic.toLatin(cleanText);

        return transliterated
            .toLowerCase()                   // noop после toLatin; для читаемости
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9/=\\ -]/g, '')
            .replace(/-+/g, '-');
    }
}