// @ts-nocheck
(function () {
  if (typeof window === 'undefined') return;

  // ---------- Конфиг ----------
  var cfg = window.__DL_TERM_CFG__ || {};
  var VISIBLE = typeof cfg.visible === 'number' ? cfg.visible : 10;
  var MORE_LABEL = typeof cfg.more === 'string' ? cfg.more : 'more';
  var COLLAPSE_LABEL = typeof cfg.collapse === 'string' ? cfg.collapse : 'collapse';

  // ---------- Occ-list (страница-индекс терминов) ----------
  function updateLast(list) {
    var prev = list.querySelectorAll('.dl-term-occ-last');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('dl-term-occ-last');
    var visible = list.querySelectorAll('.dl-term-occ:not(.dl-term-occ-hidden)');
    if (visible.length > 0) visible[visible.length - 1].classList.add('dl-term-occ-last');
  }

  function initOne(list) {
    if (list.getAttribute('data-dl-term-init') === '1') return;
    var links = list.querySelectorAll('.dl-term-occ');
    if (links.length === 0) return;

    if (links.length <= VISIBLE) {
      list.setAttribute('data-dl-term-init', '1');
      updateLast(list);
      return;
    }

    for (var i = VISIBLE; i < links.length; i++) {
      links[i].classList.add('dl-term-occ-hidden');
    }
    updateLast(list);

    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'dl-term-occ-more';
    moreBtn.textContent = MORE_LABEL + ' ' + (links.length - VISIBLE);

    var expanded = false;
    moreBtn.addEventListener('click', function () {
      expanded = !expanded;
      for (var j = VISIBLE; j < links.length; j++) {
        if (expanded) {
          links[j].classList.remove('dl-term-occ-hidden');
        } else {
          links[j].classList.add('dl-term-occ-hidden');
        }
      }
      updateLast(list);
      moreBtn.textContent = expanded ? COLLAPSE_LABEL : MORE_LABEL + ' ' + (links.length - VISIBLE);
    });

    list.appendChild(moreBtn);
    list.setAttribute('data-dl-term-init', '1');
  }

  // ---------- Тултипы ----------
  // Видимость управляется CSS (:hover/:focus-within) — как у abbr.
  // JS только позиционирует при первом показе и при скролле.
  function setupTooltips() {
    var wrappers = document.querySelectorAll('.dl-term');
    for (var i = 0; i < wrappers.length; i++) {
      (function (wrap) {
        if (wrap.getAttribute('data-dl-term-tip') === '1') return;
        var term = wrap.querySelector('abbr');
        var tip = wrap.querySelector('.dl-term-tip');
        if (!term || !tip) return;

        function reposition() {
          var aRect = term.getBoundingClientRect();

          // Уводим за экран, чтобы измерить реальные размеры
          tip.style.top = '-9999px';
          tip.style.left = '-9999px';

          var tRect = tip.getBoundingClientRect();
          var tipWidth = tRect.width || 280;
          var tipHeight = tRect.height;

          var gap = 10;
          var left = aRect.left;
          if (left + tipWidth > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - tipWidth - 8);
          }
          var top = aRect.top - tipHeight - gap;
          if (top < 8) {
            top = aRect.bottom + gap;
            tip.setAttribute('data-placement', 'bottom');
          } else {
            tip.setAttribute('data-placement', 'top');
          }

          var arrowLeft = Math.max(12, Math.min(aRect.left + aRect.width / 2 - left - 6, tipWidth - 24));
          tip.style.setProperty('--dl-term-arrow-left', arrowLeft + 'px');

          tip.style.top = top + 'px';
          tip.style.left = left + 'px';
        }

        wrap.addEventListener('mouseenter', reposition);
        term.addEventListener('focusin', reposition);
        // Следим за скроллом — чтобы тултип не отрывался от abbr
        window.addEventListener('scroll', reposition, { passive: true });

        wrap.setAttribute('data-dl-term-tip', '1');
      })(wrappers[i]);
    }
  }

  function initAll() {
    var lists = document.querySelectorAll('.dl-term-occ-list');
    for (var k = 0; k < lists.length; k++) {
      initOne(lists[k]);
    }
    setupTooltips();
    return lists.length;
  }

  var found = initAll();

  if (found === 0) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (initAll() > 0 || attempts > 120) clearInterval(timer);
    }, 250);
  }

  if (typeof MutationObserver !== 'undefined' && document.body) {
    var obs = new MutationObserver(function () {
      initAll();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  }
})();