// src/commands/diplodoc-helper.link.Paste.Utils.Clipboard.js

/**
 * @param {string} clipboardText
 * @returns {ClipboardLink | null}
 */
function buildClipboardLink(clipboardText) {
    try {
        return JSON.parse(clipboardText);
    } catch {
        return null;
    }
}

module.exports = { buildClipboardLink };
