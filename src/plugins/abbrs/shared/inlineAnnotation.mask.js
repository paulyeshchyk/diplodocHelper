const { InlineAnnotation_Mask } = require('../../utils/inline-annotation/InlineAnnotation_Mask.ts');

/**
 * @deprecated Импортируйте `InlineAnnotation_Mask` напрямую.
 * Shim оставлен до wave 4b/4c, пока `abbrs/shared/index.js` ещё
 * спредит локальные реализации для `textRange` / `template` / `model`.
 *
 * Regression: 00.5.1#17, #19 (+3).
 */
const maskCodeInMarkdown = InlineAnnotation_Mask.maskCodeInMarkdown;
const maskCodeBlocks = InlineAnnotation_Mask.maskCodeBlocks;

// PH_OPEN/PH_CLOSE больше не экспортируются: консьюмеров в src/ нет
// (проверено grep), а публичная площадь сокращается.
module.exports = { maskCodeInMarkdown, maskCodeBlocks };