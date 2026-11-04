/**
 * Экранирование для вставки в HTML-текст или в значение атрибута,
 * **заключённого в двойные кавычки**.
 *
 * ⚠️ Одинарная кавычка (`'`) **не** экранируется — это legacy-контракт
 *    `escapeHtml` из `abbrs/shared`, `terms/shared`, `figures.writer`.
 *    Использование в одинарных атрибутах (`id='${x}'`) небезопасно
 *    и намеренно не поддерживается.
 *
 * Порядок замен важен: `&` → первым, иначе получим двойное экранирование
 * уже вставленных `&amp;` / `&lt;` / `&gt;` / `&quot;`.
 *
 * Вход приводит через `String(s)` — `null` → `"null"`, `undefined` → `"undefined"`
 * (унаследовано от legacy; см. 00.5.3#05).
 */
export class Html_Escape_Text {
    static escape(s: unknown): string {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}