// @ts-nocheck
(function () {
    if (typeof window === 'undefined') return;

    var cfg = window.__DL_ABBR_CFG__ || {};
    var VISIBLE = typeof cfg.visible === 'number' ? cfg.visible : 10;
    var MORE_LABEL = typeof cfg.more === 'string' ? cfg.more : 'more';
    var COLLAPSE_LABEL = typeof cfg.collapse === 'string' ? cfg.collapse : 'collapse';

    /**
     * @param {Element} list
     */
    function updateLast(list) {
        var prev = list.querySelectorAll('.dl-abbr-occ-last');
        for (var i = 0; i < prev.length; i++) prev[i].classList.remove('dl-abbr-occ-last');
        var visible = list.querySelectorAll('.dl-abbr-occ:not(.dl-abbr-occ-hidden)');
        if (visible.length > 0) visible[visible.length - 1].classList.add('dl-abbr-occ-last');
    }

    /**
     * @param {Element} list
     */
    function initOne(list) {
        // Идемпотентность: уже обработан
        if (list.getAttribute('data-dl-abbr-init') === '1') return;

        var links = list.querySelectorAll('.dl-abbr-occ');
        if (links.length === 0) return;

        if (links.length <= VISIBLE) {
            list.setAttribute('data-dl-abbr-init', '1');
            updateLast(list);
            return;
        }

        for (var i = VISIBLE; i < links.length; i++) {
            links[i].classList.add('dl-abbr-occ-hidden');
        }
        updateLast(list);

        var moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'dl-abbr-occ-more';
        moreBtn.textContent = MORE_LABEL + ' ' + (links.length - VISIBLE);

        var expanded = false;
        moreBtn.addEventListener('click', function () {
            expanded = !expanded;
            for (var j = VISIBLE; j < links.length; j++) {
                if (expanded) {
                    links[j].classList.remove('dl-abbr-occ-hidden');
                } else {
                    links[j].classList.add('dl-abbr-occ-hidden');
                }
            }
            updateLast(list);
            moreBtn.textContent = expanded ? COLLAPSE_LABEL : MORE_LABEL + ' ' + (links.length - VISIBLE);
        });

        list.appendChild(moreBtn);
        list.setAttribute('data-dl-abbr-init', '1');
    }


    /**
     * Позиционирует тултип над <abbr> через position: fixed.
     * Живёт вне overflow: hidden любых предков.
     */
    function setupTooltips() {
        var wrappers = document.querySelectorAll('.dl-abbr');
        for (var i = 0; i < wrappers.length; i++) {
            (function (wrap) {
                if (wrap.getAttribute('data-dl-abbr-tip') === '1') return;
                var abbr = wrap.querySelector('abbr');
                var tip = wrap.querySelector('.dl-abbr-tip');
                if (!abbr || !tip) return;

                function reposition() {
                    var aRect = abbr.getBoundingClientRect();
                    // Показываем, чтобы замерить высоту
                    var prevVis = tip.style.visibility;
                    tip.style.visibility = 'hidden';
                    tip.style.top = '-9999px';
                    tip.style.left = '-9999px';

                    var tRect = tip.getBoundingClientRect();
                    var tipWidth = tRect.width || 240;
                    var tipHeight = tRect.height;

                    var gap = 10;
                    var left = aRect.left;
                    // Не вылезать за правый край viewport
                    if (left + tipWidth > window.innerWidth - 8) {
                        left = Math.max(8, window.innerWidth - tipWidth - 8);
                    }
                    var top = aRect.top - tipHeight - gap;
                    if (top < 8) {
                        // не помещается сверху — показываем снизу
                        top = aRect.bottom + gap;
                        tip.style.setProperty('--dl-abbr-arrow-left', '24px');
                        tip.setAttribute('data-placement', 'bottom');
                    } else {
                        tip.setAttribute('data-placement', 'top');
                    }

                    // Позиция стрелки относительно tooltip
                    var arrowLeft = Math.max(12, Math.min(aRect.left + aRect.width / 2 - left - 6, tipWidth - 24));
                    tip.style.setProperty('--dl-abbr-arrow-left', arrowLeft + 'px');

                    tip.style.top = top + 'px';
                    tip.style.left = left + 'px';
                    tip.style.visibility = prevVis;
                }

                abbr.addEventListener('mouseenter', reposition);
                abbr.addEventListener('focusin', reposition);
                wrap.addEventListener('mouseenter', reposition);

                wrap.setAttribute('data-dl-abbr-tip', '1');
            })(wrappers[i]);
        }
    }

    /**
     * Возвращает число обработанных (не только найденных) списков.
     * @returns {number}
     */
    function initAll() {
        var lists = document.querySelectorAll('.dl-abbr-occ-list');
        for (var k = 0; k < lists.length; k++) {
            initOne(lists[k]);
        }
        setupTooltips();
        return lists.length;
    }

    // 1. Первая попытка (если контент уже в DOM — статика)
    var found = initAll();

    // 2. Если ничего не нашли — периодические попытки до 30 секунд.
    //    Покрывает случай, когда {% cut %} рендерится после загрузки.
    if (found === 0) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (initAll() > 0 || attempts > 120) clearInterval(timer);
        }, 250);
    }

    // 3. MutationObserver — на случай, если React-дерево перерисуется позже
    //    (раскрытие cut'а, повторный рендер при смене темы, и т.п.)
    if (typeof MutationObserver !== 'undefined' && document.body) {
        var obs = new MutationObserver(function () {
            initAll();
        });
        obs.observe(document.body, { childList: true, subtree: true });
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    }
})();
