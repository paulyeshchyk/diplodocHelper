/**
 * Форматирование размера в человекочитаемый вид (Б / КБ / МБ).
 *
 * Канонический формат: `<display> <unit>`, где:
 *   - для байтов `display = Math.round(value)`;
 *   - для КБ/МБ при `value < 10` — `value.toFixed(1)`, иначе `Math.round(value)`.
 *
 * `formatted`:
 *   - 'plain'   → `1.0 КБ`, `0 Б`     (browser consumer, фича 34);
 *   - 'bracket' → ` (1.0 КБ)`, ` (0 Б)` (server consumer, фича 9).
 *
 * Нефинитные значения (Infinity, NaN) намеренно проходят «как есть»
 * в Math.round/toFixed — это наследие legacy и зафиксировано тестами.
 */
export type SizeFormatStyle = 'plain' | 'bracket';

export interface FormatSizeOptions {
    formatted?: SizeFormatStyle;
    /** Восходящий список единиц: [байт, кило, мега, ...]. */
    units?: readonly string[];
}

export class String_Format_Size {
    static readonly DEFAULT_UNITS: readonly string[] = ['Б', 'КБ', 'МБ'];

    static format(bytes: unknown, options: FormatSizeOptions = {}): string {
        const style = options.formatted ?? 'plain';
        const units = options.units ?? String_Format_Size.DEFAULT_UNITS;

        if (typeof bytes !== 'number' || bytes < 0) return '';

        const wrap = (s: string): string => (style === 'bracket' ? ` (${s})` : s);

        if (bytes === 0) return wrap(`0 ${units[0]}`);

        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }

        const display =
            unitIndex === 0 || value >= 10 ? String(Math.round(value)) : value.toFixed(1);

        return wrap(`${display} ${units[unitIndex]}`);
    }
}