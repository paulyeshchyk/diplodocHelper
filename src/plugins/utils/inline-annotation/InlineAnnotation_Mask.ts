const PH_OPEN = String.fromCodePoint(0xe000);
const PH_CLOSE = String.fromCodePoint(0xe001);
const UNMASK_RE = new RegExp(`${PH_OPEN}(\\d+)${PH_CLOSE}`, 'g');

/**
 * Маскировка блоков кода в Markdown и HTML.
 *
 * Единая точка правды для утилит, которые «прячут» код перед регексп-
 * обработкой (`<abbr>`, `<a>`, сноски, ГОСТы, …), чтобы избежать
 * false-positive срабатываний внутри кода.
 *
 * Порядок для Markdown важен:
 *   1. fenced (``` и ~~~) — целиком, вместе с внутренними backtick-ами;
 *   2. inline (`x` и ``x``);
 *   3. `<code>` / `<pre>` (HTML, регистро-независимо).
 *
 * ⚠️ `maskCodeInMarkdown` не возвращает unmask-функцию (legacy API).
 *    Маска — «одноразовая»: после замены оригинала нет, восстановить нельзя.
 *    Все текущие потребители маскируют копию для анализа и работают
 *    с оригиналом отдельно.
 */
export class InlineAnnotation_Mask {
    // --- Markdown ---------------------------------------------------------

    static maskCodeInMarkdown(text: string): string {
        let idx = 0;
        const mk = (): string => `${PH_OPEN}${idx++}${PH_CLOSE}`;

        let masked = text.replace(/(^|\n)(```|~~~)[\s\S]*?\2/g, () => mk());
        masked = masked.replace(/``[^`\n]+``|`[^`\n]+`/g, () => mk());
        masked = masked.replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, () => mk());
        return masked;
    }

    // --- HTML -------------------------------------------------------------

    static maskCodeBlocks(html: string): {
        masked: string;
        unmask: (s: string) => string;
    } {
        const placeholders: Array<{ ph: string; m: string }> = [];
        let idx = 0;

        const masked = html.replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, (m: string) => {
            const ph = `${PH_OPEN}${idx++}${PH_CLOSE}`;
            placeholders.push({ ph, m });
            return ph;
        });

        return {
            masked,
            unmask: (s: string): string =>
                s.replace(UNMASK_RE, (whole: string, i: string) => {
                    const entry = placeholders[Number(i)];
                    return entry ? entry.m : whole;
                }),
        };
    }
}