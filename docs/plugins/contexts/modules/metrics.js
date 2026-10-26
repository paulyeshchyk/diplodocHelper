// @ts-nocheck
/**
 * @typedef {Object} MetricSpec
 * @property {(ctx: import('../../model/contextmap.model').ContextData) => number} valueOf
 * @property {string} suffix                    — технический суффикс (для совместимости)
 * @property {number} pivotRatio                — доля от max, где середина палитры (0..1)
 * @property {(v: number) => string} format     — форматирование значения для подписи в ячейке
 * @property {{ ru: string, en: string }} label      — что это за метрика (для легенды)
 * @property {{ ru: string, en: string }} lowLabel   — что означает «низкое» значение
 * @property {{ ru: string, en: string }} highLabel  — что означает «высокое» значение
 */

/** @type {Record<string, MetricSpec>} */
const METRICS = {
    rank: {
        valueOf: c => c.rank,
        suffix: 'ст.',
        pivotRatio: 0.14,
        format: v => `${v} ст.`,
        label: { ru: 'Количество статей', en: 'Article count' },
        lowLabel: { ru: 'редко', en: 'rare' },
        highLabel: { ru: 'часто', en: 'frequent' },
    },
    totalSize: {
        valueOf: c => c.totalSize,
        suffix: 'Б',
        pivotRatio: 0.2,
        format: v => (v >= 1024 ? `${Math.round(v / 1024)} КБ` : `${v} Б`),
        label: { ru: 'Объём статей', en: 'Article volume' },
        lowLabel: { ru: 'мало', en: 'small' },
        highLabel: { ru: 'много', en: 'large' },
    },
    avgSize: {
        valueOf: c => c.avgSize,
        suffix: 'Б',
        pivotRatio: 0.35,
        format: v => (v >= 1024 ? `${Math.round(v / 1024)} КБ` : `${v} Б`),
        label: { ru: 'Средний размер', en: 'Average size' },
        lowLabel: { ru: 'мелкие', en: 'small articles' },
        highLabel: { ru: 'крупные', en: 'large articles' },
    },
    density: {
        valueOf: c => c.density,
        suffix: '',
        pivotRatio: 0.5,
        format: v => Number(v).toFixed(2),
        label: { ru: 'Плотность', en: 'Density' },
        lowLabel: { ru: 'рыхло', en: 'loose' },
        highLabel: { ru: 'плотно', en: 'dense' },
    },
};

/**
 * @param {string | number} nameOrSpec
 */
function resolveMetric(nameOrSpec) {
    if (typeof nameOrSpec === 'string') {
        const m = METRICS[nameOrSpec];
        if (!m) throw new Error(`Unknown metric: ${nameOrSpec}`);
        return m;
    }
    return nameOrSpec;
}

/**
 * Возвращает локализованное значение из метрики.
 * @param {string | { ru?: string, en?: string } | undefined} v
 * @param {string} lang
 */
function pickLocalized(v, lang) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[lang] ?? v.ru ?? Object.values(v).find(Boolean) ?? '';
}

module.exports = { METRICS, resolveMetric, pickLocalized };
