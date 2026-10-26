/**
 * Строит корректный href для хлебных крошек (учитывает file:// и http)
 * @param {string} lang
 * @param {string[]} parentSegments
 * @param {number} level
 * @returns {string}
 */
function buildBreadcrumbHref(lang, parentSegments, level) {
    const pathPart = parentSegments.slice(0, level + 1).join('/');

    if (isFileProtocol()) {
        // Для открытия из файловой системы — используем относительные пути
         
        const currentPath = window.location.pathname.replace(/\\/g, '/');
        const currentDirSegments = currentPath.split('/').filter(Boolean);

        // Примерная глубина от корня build
        const depth = Math.max(0, currentDirSegments.length - 2); // -2 = lang + filename

        let relative = '';
        for (let i = 0; i < depth; i++) {
            relative += '../';
        }
        return relative + lang + '/' + pathPart + '/';
    }

    // Для веб-сервера — абсолютный путь от корня
    return '/' + lang + '/' + pathPart + '/';
}

/**
 * Проверяет, открыт ли документ через file:// протокол
 * @returns {boolean}
 */
function isFileProtocol() {
     
    return typeof window !== 'undefined' && window.location?.protocol === 'file:';
}

module.exports = {
    isFileProtocol,
    buildBreadcrumbHref,
};
