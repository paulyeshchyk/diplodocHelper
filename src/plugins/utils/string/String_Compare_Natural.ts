/**
 * Натуральное сравнение строк.
 *
 * Сегменты из цифр сравниваются как числа, остальные — лексикографически
 * (`<` / `>` над строками). Поведение полностью совпадает с локальными
 * копиями `naturalCompare` из `collect-catalog` и `emit-modules-table`.
 *
 * ⚠️ Аргументы приводятся через `String(a)` — как в исходниках.
 *    Вызывающая сторона обязана передавать скаляры (`id`, `ident`, …),
 *    а не `null` / `undefined`, иначе результат недетерминирован.
 */
export class String_Compare_Natural {
    private static readonly TOKEN_RE = /(\d+)|(\D+)/g;
    private static readonly PURE_DIGITS_RE = /^\d+$/;

    /**
     * @returns отрицательное, если `a < b`; положительное, если `a > b`; 0 если равны.
     *
     * @example
     *   String_Compare_Natural.compare('a2', 'a10') < 0
     *   String_Compare_Natural.compare('a10', 'a2') > 0
     *   String_Compare_Natural.compare('a1', 'a1')  === 0
     */
    static compare(a: unknown, b: unknown): number {
        const ax = String(a).match(String_Compare_Natural.TOKEN_RE) ?? [];
        const bx = String(b).match(String_Compare_Natural.TOKEN_RE) ?? [];
        const n = Math.max(ax.length, bx.length);

        for (let i = 0; i < n; i++) {
            const x = ax[i] ?? '';
            const y = bx[i] ?? '';
            const nx = String_Compare_Natural.PURE_DIGITS_RE.test(x) ? parseInt(x, 10) : null;
            const ny = String_Compare_Natural.PURE_DIGITS_RE.test(y) ? parseInt(y, 10) : null;

            if (nx !== null && ny !== null) {
                if (nx !== ny) return nx - ny;
            } else {
                if (x < y) return -1;
                if (x > y) return 1;
            }
        }
        return 0;
    }
}