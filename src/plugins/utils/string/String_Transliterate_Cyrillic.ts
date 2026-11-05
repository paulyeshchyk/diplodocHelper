/**
 * Транслитерация: кириллица ↔ латиница + небольшая карта спецсимволов
 * для URL (`|`, `&`, `%`, `$`, `<`, `>`).
 *
 * Историческое имя: `diplodocTransliterate` / `diplodocReverseTransliterate`
 * из `plugins/utils/transliterate.js`.
 *
 * ⚠️ Контракт `toLatin`:
 *   - `toLowerCase()` применяется **до** замены. «Д» → «д» → «d».
 *     Значит результат всегда в нижнем регистре, независимо от входа;
 *   - спецсимволы (`|&%$<>`) заменяются на слова (`or`, `and`, `percent`, …)
 *     только если они в нижнем регистре — но `|`, `&`, `%`, `$`, `<`, `>`
 *     не имеют регистра, так что это всегда срабатывает;
 *   - не-строковый вход → `''` (legacy `typeof !== 'string'`).
 *
 * ⚠️ Контракт `fromLatinLegacy`:
 *   - лоссовое: `'sh'` → `'ш'`, но `'s'` + `'h'` → `'с'` + `'х'`. Порядок
 *     сортировки в `latToCyrLegend` (по убыванию длины) частично это
 *     компенсирует, но не полностью;
 *   - `'д'` в `latToCyrLegend` — самомаппинг (кириллица → кириллица).
 *     Сохранено 1:1 для совместимости, хотя семантически сомнительно;
 *   - в `src/` не используется. Экспортируется через `utils/index.js`
 *     для возможных внешних потребителей в `docs/`.
 */
export class String_Transliterate_Cyrillic {
    private static readonly CYR_TO_LAT: Readonly<Record<string, string>> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
        ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm',
        н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
        ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'y',
        э: 'ye', ю: 'yu', я: 'ya',
        '|': 'or', '&': 'and', '%': 'percent', $: 'dollar', '<': 'less', '>': 'greater',
    };

    private static readonly LAT_TO_CYR: Readonly<Record<string, string>> = {
        greater: '>', percent: '%', dollar: '$', less: '<', and: '&', or: '|',
        yo: 'ё', zh: 'ж', ch: 'ч', ye: 'э', yu: 'ю', ya: 'я', sh: 'ш',
        a: 'а', b: 'б', v: 'в', g: 'г', д: 'д', e: 'е', z: 'з', i: 'и',
        j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
        s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', y: 'ы',
    };

    private static readonly CYR_RE = String_Transliterate_Cyrillic.buildRegex(
        String_Transliterate_Cyrillic.CYR_TO_LAT,
    );
    private static readonly LAT_RE = String_Transliterate_Cyrillic.buildRegex(
        String_Transliterate_Cyrillic.LAT_TO_CYR,
    );

    /**
     * Кириллица + спецсимволы → латиница (нижний регистр).
     *
     * @example
     *   String_Transliterate_Cyrillic.toLatin('Привет Мир') === 'privet mir'
     *   String_Transliterate_Cyrillic.toLatin('Дом & Дом') === 'dom and dom'
     *   String_Transliterate_Cyrillic.toLatin(null) === ''
     */
    static toLatin(text: unknown): string {
        if (typeof text !== 'string') return '';
        return text
            .toLowerCase()
            .replace(String_Transliterate_Cyrillic.CYR_RE, m => String_Transliterate_Cyrillic.CYR_TO_LAT[m]);
    }

    /**
     * Латиница → кириллица. **Лоссовое, не используется в `src/`.**
     * Сохранено для совместимости с внешними потребителями.
     *
     * @deprecated Не используйте без явной необходимости; см. JSDoc класса.
     */
    static fromLatinLegacy(text: unknown): string {
        if (typeof text !== 'string') return '';
        return text
            .toLowerCase()
            .replace(String_Transliterate_Cyrillic.LAT_RE, m => String_Transliterate_Cyrillic.LAT_TO_CYR[m]);
    }

    private static buildRegex(map: Readonly<Record<string, string>>): RegExp {
        const keys = Object.keys(map)
            .sort((a, b) => b.length - a.length)
            .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        return new RegExp(keys, 'g');
    }
}