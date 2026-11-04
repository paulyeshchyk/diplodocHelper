/**
 * После wave 4d: shared/ содержит только `inlineAnnotation.template`
 * (loadTemplate + renderTemplate). Все остальные утилиты ушли в
 * src/utils/inline-annotation/** (см. wave 4a/4b/4c).
 *
 * Smoke: 00.5.4#21.
 */
module.exports = {
    ...require('./inlineAnnotation.template'),
};