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

    // --- Расчёт высоты и колонок для "Таблицы Менделеева" ---
    var maxRows = 1;
    cells.forEach(function (td) {
      var chips = td.querySelectorAll('.fm-chip');
      var count = chips.length;
      
      if (count > 0) {
        // Строим квадрат: сколько колонок нужно?
        var cols = Math.ceil(Math.sqrt(count));
        // Сколько рядов получится при таком количестве колонок?
        var rows = Math.ceil(count / cols);
        
        // Записываем количество колонок в CSS-переменную для этой конкретной ячейки
        td.style.setProperty('--fm-cell-cols', cols);
        
        if (rows > maxRows) maxRows = rows;
      }
    });

    // Высота строки: примерно 24px на один ряд чипов + отступы (минимум 60px)
    var rowHeight = Math.max(60, maxRows * 26 + 10);
    root.style.setProperty('--fm-row-height', rowHeight + 'px');
    // ---------------------------------------------

    console.log('[feature-map] found: filterChips=' + filterChips.length +
                ' moduleChips=' + moduleChips.length +
                ' cells=' + cells.length +
                ' (row height: ' + rowHeight + 'px)');

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
      
      var hasSelected = false, hasHovered = false;
      STRIPS.forEach(function(k) { 
        if (selected[k].size) hasSelected = true; 
        if (hovered[k]) hasHovered = true; 
      });

      if (!hasSelected && !hasHovered) {
        counterEl.textContent = 'Показано: ' + total + ' модулей';
        if (resetBtn) resetBtn.disabled = true;
        return;
      }

      var stateSel = {}, stateHov = {};
      STRIPS.forEach(function(k) {
         stateSel[k] = selected[k];
         stateHov[k] = new Set(hovered[k] ? [hovered[k]] : []);
      });

      var shown = 0;
      moduleChips.forEach(function (c) {
         var a = attrsOf(c);
         var mSel = true, mHov = true;
         
         STRIPS.forEach(function(k) {
            if (stateSel[k].size) {
               stateSel[k].forEach(function(x) { if (a[k].indexOf(x) < 0) mSel = false; });
            }
            if (stateHov[k].size) {
               stateHov[k].forEach(function(x) { if (a[k].indexOf(x) < 0) mHov = false; });
            }
         });
         
         if (mSel && mHov) shown++;
      });
      
      var prefix = hasHovered ? 'Будет показано: ' : 'Показано: ';
      counterEl.textContent = prefix + shown + ' из ' + total + ' модулей';
      if (resetBtn) resetBtn.disabled = false; 
    }

    function render() {
      var active = anyActive();
      var hasHovered = false;
      STRIPS.forEach(function(k) { if (hovered[k]) hasHovered = true; });

      // 1. Обработка чипов модулей
      moduleChips.forEach(function (chip) {
        var a = attrsOf(chip);
        var mSel = true, mHov = true;
        
        STRIPS.forEach(function(k) {
          if (selected[k].size) {
            selected[k].forEach(function(x) { if (a[k].indexOf(x) < 0) mSel = false; });
          }
          if (hovered[k]) {
            if (a[k].indexOf(hovered[k]) < 0) mHov = false;
          }
        });

        chip.classList.remove('is-highlight', 'is-preview-add', 'is-preview-drop', 'is-dimmed');

        if (active) {
          if (hasHovered) {
            if (mSel && mHov) chip.classList.add('is-highlight');
            else if (!mSel && mHov) chip.classList.add('is-preview-add'); // Добавится
            else if (mSel && !mHov) chip.classList.add('is-preview-drop'); // Исчезнет
            else chip.classList.add('is-dimmed');
          } else {
            if (mSel) chip.classList.add('is-highlight');
            else chip.classList.add('is-dimmed');
          }
        }
      });

      // 2. Обработка самих ячеек (td)
      cells.forEach(function (td) {
        var chips = td.querySelectorAll('.fm-chip');
        td.classList.remove('is-dimmed', 'is-cell-highlight', 'is-cell-preview-add');
        
        if (!active) return;

        var hasHighlight = false, hasPreviewAdd = false;
        chips.forEach(function(c) {
          if (c.classList.contains('is-highlight')) hasHighlight = true;
          if (c.classList.contains('is-preview-add')) hasPreviewAdd = true;
        });

        if (hasHighlight) {
          td.classList.add('is-cell-highlight');
        } else if (hasPreviewAdd) {
          td.classList.add('is-cell-preview-add');
        } else {
          td.classList.add('is-dimmed'); // Всё остальное становится единым серым
        }
      });

      // 3. Обновление кнопок фильтров
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