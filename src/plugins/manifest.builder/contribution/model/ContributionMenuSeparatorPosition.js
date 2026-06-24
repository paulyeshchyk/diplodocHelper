// src/manifest/models/SeparatorPosition.js

/**
 * Позиция разделителя в меню.
 * Влияет на префикс в group:
 * - NONE: без разделителя, префикс не добавляется
 * - BOTTOM: разделитель снизу, добавляется префикс 'z' (ставит в конец)
 * - TOP: разделитель сверху, добавляется префикс '0' (ставит в начало)
 */
const ContributionSeparatorPosition = {
    NONE: 'none',
    BOTTOM: 'bottom',
    TOP: 'top',
};

module.exports = ContributionSeparatorPosition;
