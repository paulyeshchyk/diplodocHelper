(function () {
  var root = document.querySelector('[data-feature-map]');
  if (!root) return;

  var selected = { actor: new Set(), capability: new Set() };
  var hovered  = { actor: null, capability: null };

  var stripChips   = root.querySelectorAll('.fm-strip .fm-chip');
  var grid         = root.querySelector('[data-modules]');
  if (!grid) return;
  var moduleChips  = grid.querySelectorAll('.fm-chip');
  var cells        = grid.querySelectorAll('td');

  function attrsOf(chip) {
    return {
      actor:      (chip.dataset.actor || '').split(/\s+/).filter(Boolean),
      capability: (chip.dataset.cap   || '').split(/\s+/).filter(Boolean),
    };
  }

  function needs(type) {
    var s = new Set(selected[type]);
    if (hovered[type]) s.add(hovered[type]);
    return s;
  }

  function chipMatches(chip) {
    var a = attrsOf(chip);
    var needA = needs('actor');
    var needC = needs('capability');
    if (needA.size && !Array.from(needA).every(function (x) { return a.actor.indexOf(x) >= 0; })) return false;
    if (needC.size && !Array.from(needC).every(function (x) { return a.capability.indexOf(x) >= 0; })) return false;
    return true;
  }

  function render() {
    var active = selected.actor.size + selected.capability.size +
                 (hovered.actor ? 1 : 0) + (hovered.capability ? 1 : 0) > 0;

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

    stripChips.forEach(function (chip) {
      var t = chip.dataset.strip, v = chip.dataset.value;
      chip.classList.toggle('is-active', selected[t].has(v));
      chip.classList.toggle('is-peer',   hovered[t] === v);
    });
  }

  stripChips.forEach(function (chip) {
    var t = chip.dataset.strip, v = chip.dataset.value;
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      if (selected[t].has(v)) selected[t].delete(v); else selected[t].add(v);
      render();
    });
    chip.addEventListener('mouseenter', function () { hovered[t] = v; render(); });
    chip.addEventListener('mouseleave', function () { hovered[t] = null; render(); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    selected.actor.clear(); selected.capability.clear();
    hovered.actor = null;   hovered.capability = null;
    render();
  });

  render();
})();