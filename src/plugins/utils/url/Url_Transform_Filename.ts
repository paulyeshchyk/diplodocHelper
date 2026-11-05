/**
 * Slug для **имён файлов**, сохраняющий читаемость для человека.
 *
 * Историческое имя: `slugify_filename` из `utils/encoding.slugify.js`.
 *
 * Отличия от B-2 (`Url_Transform_Segment`) и B-3 (`Url_Transform_Reference`):
 *   - **не транслитерирует** — кириллица, латиница, CJK, любые `\p{L}`
 *     сохраняются как есть;
 *   - **не приводит к нижнему регистру** — `'ПРИВЕТ'` остаётся `'ПРИВЕТ'`;
 *   - whitelist: `[\p{L}\p{N}\-._]` — буквы, цифры, дефис, точка, underscore;
 *   - **`_` в whitelist**, но `_+` collapse (в отличие от дефиса — `--`
 *     не схлопывается, если только `-` не попал в замену);
 *   - **`.` не trim'ится** — `'file.'` → `'file.'`, `'.hidden'` → `'.hidden'`;
 *   - **guard на не-строку отсутствует** — `null`/`undefined`/число
 *     вызовут `TypeError` (legacy-контракт; см. ниже).
 *
 * ⚠️ Legacy-контракт "падает на не-строке":
 *    `_alphanumeric` и `_reference` имеют `if (typeof !== 'string') return ''`,
 *    а `_filename` — нет. Это не упущение: caller (`contexts.writer.js`)
 *    всегда передаёт ключ `contextMap` (гарантированно `string`).
 *    Молчаливый `''` привёл бы к файлу `.md` (пустое имя) — хуже, чем падение.
 *
 * ⚠️ Используется в `contexts.writer.js`:
 *    - `writeTermFiles` → `path.join(outputDir, \`${slug}.md\`)`;
 *    - `writeTailFile`  → `[\${term}](\${slug}.md)`.
 *    Смена правил = переименование файлов + битые ссылки в существующих
 *    страницах 'docs\/ru\/**\/Контексты\/'. Frozen-snapshot это ловит.
 */
export class Url_Transform_Filename {
    /**
     * @example
     *   Url_Transform_Filename.slugify('Привет Мир')  === 'Привет_Мир'
     *   Url_Transform_Filename.slugify('ПРИВЕТ')      === 'ПРИВЕТ'
     *   Url_Transform_Filename.slugify('a.b.c')       === 'a.b.c'
     *   Url_Transform_Filename.slugify('a___b')       === 'a_b'
     *   Url_Transform_Filename.slugify('a/b')         === 'a_b'
     */
    static slugify(text: string): string {
        return text
            .replace(/[^\p{L}\p{N}\-._]/gu, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}