/* eslint-disable no-undef */
(function () {
    function fixFootnoteLinks() {
        var currentPath = window.location.pathname;

        document.querySelectorAll('.footnote-ref a[href^="#fn"]').forEach(function (link) {
            var hash = link.getAttribute('href');
            if (hash && hash[0] === '#') {
                // @ts-ignore
                link.href = currentPath + hash;
            }
        });

        document.querySelectorAll('.footnote-backref[href^="#fnref"]').forEach(function (link) {
            var hash = link.getAttribute('href');
            if (hash && hash[0] === '#') {
                // @ts-ignore
                link.href = currentPath + hash;
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixFootnoteLinks);
    } else {
        fixFootnoteLinks();
    }

    var observer = new MutationObserver(fixFootnoteLinks);
    observer.observe(document.body, { childList: true, subtree: true });
})();
