// src/plugins/breadcrumb/inject-breadcrumb-body.js

(function() {
    var titles = {{TITLES_MAP}};
    var separator = {{SEPARATOR}};
    var classes = {{CLASSES}};
    var containerSelector = {{CONTAINER_SELECTOR}};
    var lang = {{LANG}};
    var parentSegments = {{PARENT_SEGMENTS}};

    // @ts-ignore
    function getTitleForPath(relativePath) {
        var normalized = relativePath.replace(/\\/g, '/');
        // @ts-ignore
        if (titles[normalized]) return titles[normalized];
        if (normalized.endsWith('/index.html')) {
            var withoutIndex = normalized.slice(0, -10);
            // @ts-ignore
            if (titles[withoutIndex + '.html']) return titles[withoutIndex + '.html'];
            // @ts-ignore
            if (titles[withoutIndex + '/index.html']) return titles[withoutIndex + '/index.html'];
        }
        return null;
    }

    // @ts-ignore
    function beautify(name) {
        return name.replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2')
                   .replace(/([A-ZА-ЯЁ])([A-ZА-ЯЁ][a-zа-яё])/g, '$1 $2');
    }

    function addBreadcrumb() {
        // @ts-ignore
        var container = document.querySelector(containerSelector);
        if (!container) {
            setTimeout(addBreadcrumb, 300);
            return;
        }
        // @ts-ignore
        if (container.querySelector('.' + classes.nav)) return;

        var ol = document.createElement('ol');
        // @ts-ignore
        ol.className = classes.list;

        var baseHref = '/' + lang + '/';

        // @ts-ignore
        for (var i = 0; i < parentSegments.length; i++) {
            // @ts-ignore
            var seg = parentSegments[i];
            var li = document.createElement('li');
            // @ts-ignore
            li.className = classes.item;

            // @ts-ignore
            var title = getTitleForPath(lang + '/' + parentSegments.slice(0, i+1).join('/') + '/index.html') 
                     || beautify(seg);

            var a = document.createElement('a');
            // @ts-ignore
            a.href = baseHref + parentSegments.slice(0, i+1).join('/') + '/';
            // @ts-ignore
            a.className = classes.link;
            a.textContent = title;

            li.appendChild(a);
            ol.appendChild(li);

            // @ts-ignore
            if (i < parentSegments.length - 1) {
                var sep = document.createElement('span');
                // @ts-ignore
                sep.className = classes.separator;
                // @ts-ignore
                sep.textContent = separator;
                ol.appendChild(sep);
            }
        }

        var nav = document.createElement('nav');
        // @ts-ignore
        nav.className = classes.nav;
        nav.setAttribute('aria-label', 'breadcrumb');
        nav.appendChild(ol);
        container.insertBefore(nav, container.firstChild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBreadcrumb);
    } else {
        addBreadcrumb();
    }
// @ts-ignore
})();