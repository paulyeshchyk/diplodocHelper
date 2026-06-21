// src/commands/diplodoc-helper.links.js

/**
 * @param {string} encodedPath
 */
function decodeLinkPath(encodedPath) {
    try {
        return decodeURIComponent(encodedPath);
    } catch {
        return encodedPath;
    }
}

/**
 * @param {string} p
 */
function encodePathSegments(p) {
    return p
        .split('/')
        .map(seg => encodeURIComponent(seg))
        .join('/');
}

module.exports = { decodeLinkPath, encodePathSegments };
