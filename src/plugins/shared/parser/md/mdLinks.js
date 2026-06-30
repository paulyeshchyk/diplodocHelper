/**
 * @param {import("../../../../commands/diplodoc-helper.links.md").MdLink} link
 */
function isExternalLink(link) {
    const match = link.rawPath.match(/^(https?:\/\/|#|mailto:|\/)/i);
    return match ? true : false;
}

/**
 * Проверяет, является ли ссылка внешним ресурсом или data URL.
 * @param {string} rawLink
 * @returns {boolean}
 */
function isRemoteOrDataUrl(rawLink) {
    return /^(https?:\/\/|#|mailto:|data:)/i.test(rawLink);
}

module.exports = { isExternalLink, isRemoteOrDataUrl };
