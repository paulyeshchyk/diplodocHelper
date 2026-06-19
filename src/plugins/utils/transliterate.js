/**
 * Словарь для ПРЯМОГО перевода (Кириллица и спецсимволы -> Латиница).
 */
const cyrToLatLegend = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'j',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sh',
    ъ: 'u',
    ы: 'y',
    ь: 'e',
    э: 'ye',
    ю: 'yu',
    я: 'ya',

    // Только те спецсимволы, которые Diplodoc переводит в слова
    '|': 'or',
    '&': 'and',
    '%': 'percent',
    $: 'dollar',
    '<': 'less',
    '>': 'greater',
};

/**
 * Словарь для ОБРАТНОГО перевода (Латиница -> Кириллица).
 */
const latToCyrLegend = {
    greater: '>',
    percent: '%',
    dollar: '$',
    less: '<',
    and: '&',
    or: '|',

    yo: 'ё',
    zh: 'ж',
    ch: 'ч',
    ye: 'э',
    yu: 'ю',
    ya: 'я',
    sh: 'щ', // Ваше условие: sh -> щ

    a: 'а',
    b: 'б',
    v: 'в',
    g: 'г',
    д: 'д',
    e: 'е',
    z: 'з',
    i: 'и',
    j: 'й',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'ъ',
    f: 'ф',
    h: 'х',
    c: 'ц',
    y: 'ы',
};

const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cyrRegex = new RegExp(
    Object.keys(cyrToLatLegend)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|'),
    'g'
);
const latRegex = new RegExp(
    Object.keys(latToCyrLegend)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|'),
    'g'
);

function diplodocTransliterate(text) {
    if (typeof text !== 'string') return '';
    return text.toLowerCase().replace(cyrRegex, match => cyrToLatLegend[match]);
}

function diplodocReverseTransliterate(text) {
    if (typeof text !== 'string') return '';
    return text.toLowerCase().replace(latRegex, match => latToCyrLegend[match]);
}

module.exports = {
    diplodocTransliterate,
    diplodocReverseTransliterate,
};
