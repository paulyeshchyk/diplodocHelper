// breadcrumb-script/inject-breadcrumb-body.js
(function() {
    var titles = {{TITLES_MAP}};
    var separator = {{SEPARATOR}};
    var classes = {{CLASSES}};
    var containerSelector = {{CONTAINER_SELECTOR}};
    var lang = {{LANG}};
    var parentSegments = {{PARENT_SEGMENTS}};

    /**
 * @param {string} relativePath
 */
    function getTitleForPath(relativePath) {
        var normalized = relativePath.replace(/\\/g, '/');
        if (titles[normalized]) return titles[normalized];
        if (normalized.endsWith('/index.html')) {
            var withoutIndex = normalized.slice(0, -10);
            if (titles[withoutIndex + '.html']) return titles[withoutIndex + '.html'];
            if (titles[withoutIndex + '/index.html']) return titles[withoutIndex + '/index.html'];
        }
        return null;
    }

    /**
 * @param {string} name
 */
    function beautify(name) {
        return name.replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2')
                   .replace(/([A-ZА-ЯЁ])([A-ZА-ЯЁ][a-zа-яё])/g, '$1 $2');
    }

    function addBreadcrumb() {
        var container = document.querySelector(containerSelector);
        if (!container) {
            console.log('[Breadcrumb] Контейнер не найден, повтор через 300 мс');
            setTimeout(addBreadcrumb, 300);
            return;
        }
        if (container.querySelector('.' + classes.nav)) {
            console.log('[Breadcrumb] Крошки уже есть');
            return;
        }

        var accumulated = '/' + lang;
        var ol = document.createElement('ol');
        ol.className = classes.list;

        for (var i = 0; i < parentSegments.length; i++) {
            var seg = parentSegments[i];
            accumulated += '/' + seg;
            var li = document.createElement('li');
            li.className = classes.item;
            var segmentPath = lang + '/' + parentSegments.slice(0, i+1).join('/') + '/index.html';
            var title = getTitleForPath(segmentPath) || beautify(seg);
            var a = document.createElement('a');
            a.href = accumulated + '/';
            a.className = classes.link;
            a.textContent = title;
            li.appendChild(a);
            ol.appendChild(li);
            if (i < parentSegments.length - 1) {
                var sep = document.createElement('span');
                sep.className = classes.separator;
                sep.textContent = separator;
                ol.appendChild(sep);
            }
        }

        var nav = document.createElement('nav');
        nav.className = classes.nav;
        nav.setAttribute('aria-label', 'breadcrumb');
        nav.appendChild(ol);
        container.insertBefore(nav, container.firstChild);
        console.log('[Breadcrumb] Крошки добавлены');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBreadcrumb);
    } else {
        addBreadcrumb();
    }
})();