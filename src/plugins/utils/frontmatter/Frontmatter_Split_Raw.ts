/**
 * Результат разделения `.md`-файла на frontmatter-блок и тело.
 */
export interface FrontmatterSplitResult {
    /** Содержимое между `---` без самих разделителей. Не парсится (YAML остаётся строкой). */
    frontmatter: string;
    /** Всё после закрывающего `---`. Может быть пустым. */
    body: string;
}

/**
 * Разделение `.md`-файла на raw-frontmatter и raw-body.
 *
 * Заменяет локальные `splitFrontmatter(content)` из `collect-catalog/index.js`
 * и `build-page-legend/index.js` (идентичные реализации).
 *
 * Отличия от `frontmatter.utils.parse` (gray-matter):
 *   - **не парсит** YAML — возвращает frontmatter как строку;
 *   - **не бросает** при невалидном YAML — валидация на вызывающем;
 *   - `null` при отсутствии frontmatter (тогда как `parse` вернёт `{data: {}, ...}`);
 *   - сохраняет body **как есть**, включая ведущие переносы строк.
 *
 * Регулярка: `^---\r?\n...\r?\n---\r?\n?body`.
 *   - работает с CRLF и LF;
 *   - trailing `\r?\n` после закрывающего `---` опционален (файл может
 *     заканчиваться на `---`).
 *
 * @example
 *   Frontmatter_Split_Raw.split('---\ntitle: A\n---\n\nbody')
 *     → { frontmatter: 'title: A', body: '\nbody' }
 *   Frontmatter_Split_Raw.split('no frontmatter')
 *     → null
 */
export class Frontmatter_Split_Raw {
    static split(content: string): FrontmatterSplitResult | null {
        const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        if (!m) return null;
        return { frontmatter: m[1], body: m[2] };
    }
}