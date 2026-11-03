(function () {
  function init() {
    var root = document.querySelector('[data-feature-map]');
    if (!root) {
      // Diplodoc (React) ещё не отрисовал таблицу — ждём
      return false;
    }

    // Защита от повторного запуска, если скрипт вызовется ещё раз
    if (root.dataset.fmInit === '1') return true;
    root.dataset.fmInit = '1';

    console.log('[feature-map] root found, initializing...');

    var STRIPS = ['actor', 'capability', 'layer', 'family'];

    var selected = {}, hovered = {};
    STRIPS.forEach(function (k) { selected[k] = new Set(); hovered[k] = null; });

    var filterChips = root.querySelectorAll('[data-strip][data-value]');
    var grid        = root.querySelector('[data-modules]');
    if (!grid) {
      console.warn('[feature-map] grid [data-modules] not found inside root');
      return true; // root есть, но таблицы нет — значит что-то не так с HTML
    }
    
    var moduleChips = grid.querySelectorAll('.fm-chip');
    var cells       = grid.querySelectorAll('td');
    var counterEl   = root.querySelector('.fm-counter');
    var resetBtn    = root.querySelector('.fm-reset-all');

    console.log('[feature-map] found: filterChips=' + filterChips.length +
                ' moduleChips=' + moduleChips.length +
                ' cells=' + cells.length +
                ' resetBtn=' + !!resetBtn);

    function attrsOf(chip) {
      return {
        actor:      (chip.dataset.actor  || '').split(/\s+/).filter(Boolean),
        capability: (chip.dataset.cap    || '').split(/\s+/).filter(Boolean),
        layer:      (chip.dataset.layer  || '').split(/\s+/).filter(Boolean),
        family:     (chip.dataset.family || '').split(/\s+/).filter(Boolean),
      };
    }

    function needs(k) {
      var s = new Set(selected[k]);
      if (hovered[k]) s.add(hovered[k]);
      return s;
    }

    function chipMatches(chip) {
      var a = attrsOf(chip);
      for (var i = 0; i < STRIPS.length; i++) {
        var k = STRIPS[i];
        var need = needs(k);
        if (!need.size) continue;
        var have = a[k], ok = true;
        need.forEach(function (x) { if (have.indexOf(x) < 0) ok = false; });
        if (!ok) return false;
      }
      return true;
    }

    function anyActive() {
      for (var i = 0; i < STRIPS.length; i++) {
        if (selected[STRIPS[i]].size || hovered[STRIPS[i]]) return true;
      }
      return false;
    }

    function updateCounter() {
      if (!counterEl) return;
      var total = moduleChips.length;
      if (!anyActive()) {
        counterEl.textContent = 'Показано: ' + total + ' модулей';
        if (resetBtn) resetBtn.disabled = true;
        return;
      }
      var shown = 0;
      moduleChips.forEach(function (c) { if (chipMatches(c)) shown++; });
      counterEl.textContent = 'Показано: ' + shown + ' из ' + total + ' модулей';
      if (resetBtn) resetBtn.disabled = false;
    }

    function render() {
      var active = anyActive();

      moduleChips.forEach(function (chip) {
        var ok = chipMatches(chip);
        chip.classList.toggle('is-highlight', active && ok);
        chip.classList.toggle('is-dimmed',    active && !ok);
      });

      cells.forEach(function (td) {
        var chips = td.querySelectorAll('.fm-chip');
        if (!chips.length) return;
        var any = Array.prototype.some.call(chips, chipMatches);
        td.classList.toggle('is-highlight', active && any);
        td.classList.toggle('is-dimmed',    active && !any);
      });

      filterChips.forEach(function (chip) {
        var t = chip.dataset.strip, v = chip.dataset.value;
        chip.classList.toggle('is-active', selected[t].has(v));
        chip.classList.toggle('is-peer',   hovered[t] === v);
      });

      updateCounter();
    }

    // --- клики и hover на фильтрах
    filterChips.forEach(function (chip) {
      var t = chip.dataset.strip, v = chip.dataset.value;

      chip.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[feature-map] click filter:', t, '=', v);
        if (selected[t].has(v)) selected[t].delete(v); else selected[t].add(v);
        render();
      });
      chip.addEventListener('mouseenter', function () { hovered[t] = v; render(); });
      chip.addEventListener('mouseleave', function () { hovered[t] = null; render(); });
    });

    // --- сброс
    if (resetBtn) {
      resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('[feature-map] reset');
        STRIPS.forEach(function (k) { selected[k].clear(); hovered[k] = null; });
        render();
      });
    }

    // --- Esc
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      console.log('[feature-map] escape reset');
      STRIPS.forEach(function (k) { selected[k].clear(); hovered[k] = null; });
      render();
    });

    render();
    return true;
  }

  // Пытаемся запуститься сразу, если не выходит — опрашиваем DOM каждые 200 мс
  if (!init()) {
    var timer = setInterval(function () {
      if (init()) {
        clearInterval(timer);
      }
    }, 200);
    
    // Защита от бесконечного цикла (10 секунд)
    setTimeout(function () { clearInterval(timer); }, 10000);
  }
})();