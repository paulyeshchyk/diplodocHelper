document.addEventListener('DOMContentLoaded', function () {

  // --- 1. Резолвер относительных/абсолютных путей для превью ---
  function resolveDataSrc(img) {
    if (img.src && img.src !== window.location.href) return; // Уже обработано
    const rel = img.getAttribute('data-src');
    if (!rel) return;

    if (rel.startsWith('/')) {
      img.src = rel;
    } else {
      try {
        img.src = new URL(rel, window.location.href).href;
      } catch (e) {
        console.warn('Не удалось разрешить путь:', rel, e);
        img.src = rel;
      }
    }
  }

  // Запуск для существующих картинок
  document.querySelectorAll('img[data-src]').forEach(resolveDataSrc);

  // Следим за динамическим добавлением картинок (например, при переключении Сетка/Список)
  const observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType === 1) {
          if (node.tagName === 'IMG' && node.hasAttribute('data-src')) {
            resolveDataSrc(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('img[data-src]').forEach(resolveDataSrc);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });


  // --- 2. Инициализация Lightbox ---
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 8;
  const ZOOM_STEP = 1.25;

  // Создаем оверлей
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <img class="lightbox-img" alt="" />
    <div class="lightbox-controls">
      <button type="button" data-action="zoom-out" title="Уменьшить">−</button>
      <div class="zoom-level">100%</div>
      <button type="button" data-action="zoom-in" title="Увеличить">+</button>
      <button type="button" data-action="reset" title="Сбросить (0)">1:1</button>
      <button type="button" data-action="close" title="Закрыть (Esc)">✕</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const img = overlay.querySelector('.lightbox-img');
  const zoomLevelEl = overlay.querySelector('.zoom-level');

  // Состояние
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let baseWidth = 0;
  let baseHeight = 0;
  let isOpen = false;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragStartTx = 0, dragStartTy = 0;

  // Применение трансформации
  function apply() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLevelEl.textContent = Math.round(scale * 100) + '%';
  }

  // Подгонка под экран при открытии
  function fitToScreen() {
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fit = Math.min(vw / natW, vh / natH, 1);
    baseWidth = natW * fit;
    baseHeight = natH * fit;

    img.style.width = baseWidth + 'px';
    img.style.height = baseHeight + 'px';

    scale = 1;
    tx = (vw - baseWidth) / 2;
    ty = (vh - baseHeight) / 2;
    apply();
  }

  // Ограничение позиции
  function clampPosition() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = baseWidth * scale;
    const h = baseHeight * scale;

    if (w <= vw) {
      tx = (vw - w) / 2;
    } else {
      tx = Math.min(0, Math.max(vw - w, tx));
    }
    if (h <= vh) {
      ty = (vh - h) / 2;
    } else {
      ty = Math.min(0, Math.max(vh - h, ty));
    }
  }

  // Зум относительно точки (cx, cy)
  function zoomAt(cx, cy, factor) {
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (newScale === scale) return;

    const worldX = (cx - tx) / scale;
    const worldY = (cy - ty) / scale;

    scale = newScale;
    tx = cx - worldX * scale;
    ty = cy - worldY * scale;

    clampPosition();
    apply();
  }

  function resetZoom() {
    scale = 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    tx = (vw - baseWidth) / 2;
    ty = (vh - baseHeight) / 2;
    apply();
  }

  // Открытие / закрытие
  function openLightbox(src, alt) {
    img.src = src;
    img.alt = alt || '';
    overlay.classList.add('active');
    document.body.classList.add('lightbox-open');
    isOpen = true;

    if (img.complete && img.naturalWidth) {
      fitToScreen();
    } else {
      img.onload = () => fitToScreen();
    }
  }

  function closeLightbox() {
    overlay.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    isOpen = false;
    img.src = '';
  }

  // Делегирование кликов для открытия лайтбокса (работает с динамическими элементами)
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.js-lightbox-trigger');
    if (!trigger) return;

    e.preventDefault();
    const fullSrc = trigger.getAttribute('data-full-src') || trigger.src || trigger.getAttribute('data-src');
    openLightbox(fullSrc, trigger.alt);
  });

  // Управление элементами внутри оверлея
  overlay.addEventListener('click', function (e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') return closeLightbox();
    if (action === 'zoom-in') {
      return zoomAt(window.innerWidth / 2, window.innerHeight / 2, ZOOM_STEP);
    }
    if (action === 'zoom-out') {
      return zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / ZOOM_STEP);
    }
    if (action === 'reset') {
      return resetZoom();
    }
    if (e.target === overlay && !isDragging) {
      closeLightbox();
    }
  });

  // Колесо мыши
  overlay.addEventListener('wheel', function (e) {
    if (!isOpen) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // Drag (перетаскивание)
  overlay.addEventListener('mousedown', function (e) {
    if (!isOpen) return;
    if (e.target.closest('[data-action]')) return;
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTx = tx;
    dragStartTy = ty;

    const onMove = function (ev) {
      const dx = ev.clientX - dragStartX;
      const dy = ev.clientY - dragStartY;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        overlay.classList.add('dragging');
      }
      if (isDragging) {
        tx = dragStartTx + dx;
        ty = dragStartTy + dy;
        clampPosition();
        apply();
      }
    };

    const onUp = function () {
      overlay.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setTimeout(() => { isDragging = false; }, 0);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Двойной клик
  overlay.addEventListener('dblclick', function (e) {
    if (e.target.closest('[data-action]')) return;
    if (scale > 1.1) {
      resetZoom();
    } else {
      zoomAt(e.clientX, e.clientY, 2.5);
    }
  });

  // Клавиатура
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      if (scale > 1.05) resetZoom();
      else closeLightbox();
    } else if (e.key === '+' || e.key === '=') {
      zoomAt(window.innerWidth / 2, window.innerHeight / 2, ZOOM_STEP);
    } else if (e.key === '-') {
      zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / ZOOM_STEP);
    } else if (e.key === '0') {
      resetZoom();
    }
  });

  // Touch события
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchCenterX = 0, pinchCenterY = 0;

  overlay.addEventListener('touchstart', function (e) {
    if (!isOpen) return;
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartScale = scale;
      pinchCenterX = (a.clientX + b.clientX) / 2;
      pinchCenterY = (a.clientY + b.clientY) / 2;
    } else if (e.touches.length === 1) {
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartTx = tx;
      dragStartTy = ty;
    }
  }, { passive: false });

  overlay.addEventListener('touchmove', function (e) {
    if (!isOpen) return;
    e.preventDefault();
    if (e.touches.length === 2 && pinchStartDist > 0) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * (dist / pinchStartDist)));

      const worldX = (pinchCenterX - tx) / scale;
      const worldY = (pinchCenterY - ty) / scale;
      scale = targetScale;
      tx = pinchCenterX - worldX * scale;
      ty = pinchCenterY - worldY * scale;
      clampPosition();
      apply();
    } else if (e.touches.length === 1) {
      tx = dragStartTx + (e.touches[0].clientX - dragStartX);
      ty = dragStartTy + (e.touches[0].clientY - dragStartY);
      clampPosition();
      apply();
    }
  }, { passive: false });

  overlay.addEventListener('touchend', function () {
    pinchStartDist = 0;
  });

  // Ресайз окна
  window.addEventListener('resize', function () {
    if (!isOpen) return;
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const oldBaseW = baseWidth;
    const oldBaseH = baseHeight;
    const fit = Math.min(vw / natW, vh / natH, 1);
    baseWidth = natW * fit;
    baseHeight = natH * fit;
    img.style.width = baseWidth + 'px';
    img.style.height = baseHeight + 'px';

    if (oldBaseW && oldBaseH) {
      const cx = vw / 2;
      const cy = vh / 2;
      const worldX = (cx - tx) / scale;
      const worldY = (cy - ty) / scale;
      const k = baseWidth / oldBaseW;
      tx = cx - worldX * k * scale;
      ty = cy - worldY * k * scale;
    }
    clampPosition();
    apply();
  });

});