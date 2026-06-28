/**
 * @param {string | any[]} str
 */
function truncateMiddle(str, maxLength = 52, separator = '...') {
    if (str.length <= maxLength) return str;
    const keep = Math.floor((maxLength - separator.length) / 2);
    const start = str.slice(0, keep);
    const end = str.slice(-keep);
    return start + separator + end;
}

exports.truncateMiddle = truncateMiddle;
