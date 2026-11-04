/**
 * Готовит готовый HTML-фрагмент к вставке внутрь JSON-строки.
 *
 * Историческое имя: `jsonEscapeHtmlForDiplodoc`. Применяется, когда
 * инжектор уже собрал HTML (tooltip, figure caption и т.п.) и его нужно
 * положить в `JSON.stringify({ html: ... })` так, чтобы при последующем
 * `JSON.parse` на клиенте восстановился исходный HTML.
 *
 * Замены:
 *   `<` → `&lt;`, `>` → `&gt;` (стандарт для HTML-in-state Diplodoc);
 *   `"` → `\"`                    (JSON-экранирование);
 *   `\n` / `\r` / `\t` → escape-последовательности.
 *
 * `&` **не** трогаем: значения атрибутов уже прошли `Html_Escape_Text`
 * на этапе рендера, повторное экранирование сломает восстановление.
 *
 * Вход приводит через `String(html)` — `null` → `"null"` (legacy).
 */
export class Html_Escape_JsonString {
    static escape(html: unknown): string {
        return String(html)
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
}