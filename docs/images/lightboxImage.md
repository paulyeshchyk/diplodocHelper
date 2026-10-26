
## Вставка

```
<figure>

  <img 
    data-src="diagrams/App_Roadmap_Decomposition.png" 
    alt="Декомпозиция" 
    class="js-lightbox-trigger"
    style="width: 10%; cursor: zoom-in;"
  />

  <figcaption class="imageDescription" id="fig-app_roadmap_decomposition">Рисунок 5. Декомпозиция</figcaption>

</figure>
```

## Обязательное условие наличия 

### надстройки

```.yfm
...

resources:
    script:
	...	
        - ./_assets/scripts/lightbox.js
    style:
	...
        - _assets/style/lightbox.css
...

```

### css

```lightbox.css
/* =========================================================
   Lightbox: оверлей, панель управления, скрим
   ========================================================= */

.lightbox-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none; /* отключаем нативный скролл/зум на тач */
}

.lightbox-overlay.active {
  display: block;
}

.lightbox-overlay.dragging {
  cursor: grabbing;
}

/* Скрим (вариант 3): затемнение сверху, чтобы контролы
   всегда читались поверх светлых картинок */
.lightbox-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.55),
    rgba(0, 0, 0, 0.15) 60%,
    transparent
  );
  pointer-events: none;
  z-index: 1;
}

/* Сама картинка */
.lightbox-overlay .lightbox-img {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
  image-rendering: -webkit-optimize-contrast;
}

/* ---------- Панель управления ---------- */

.lightbox-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

/* Общая стилизация всех элементов панели — и кнопок, и счётчика.
   Так они гарантированно совпадают по высоте, радиусу и шрифту. */
.lightbox-controls button,
.lightbox-controls .zoom-level {
  height: 44px;
  min-height: 44px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;

  color: #fff;
  background: rgba(20, 20, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  transition: background 0.15s, transform 0.1s;
}

/* Кнопки — фиксированной ширины */
.lightbox-controls button {
  width: 44px;
  padding: 0;
  font-size: 20px;
  cursor: pointer;
}

.lightbox-controls button:hover {
  background: rgba(40, 40, 40, 0.92);
}

.lightbox-controls button:active {
  transform: scale(0.95);
}

/* Счётчик процентов — фиксированная ширина, чтобы панель
   не дёргалась при изменении "5%" → "305%" */
.lightbox-controls .zoom-level {
  min-width: 72px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  letter-spacing: 0.02em;
  cursor: default;
}

/* ---------- Глобальный лок скролла ---------- */

body.lightbox-open {
  overflow: hidden;
}
```

### js

```lightbox.js
document.addEventListener('DOMContentLoaded', function () {

  // --- Резолвер относительных путей ---
  // Для всех изображений с data-src вычисляем абсолютный URL
  // относительно текущей страницы и подставляем в src.
  document.querySelectorAll('img[data-src]').forEach(img => {
    const rel = img.getAttribute('data-src');
    if (!rel) return;
    try {
      // new URL корректно склеивает относительный путь с текущим location,
      // учитывая ../, ./ и кириллицу в пути.
      img.src = new URL(rel, window.location.href).href;
    } catch (e) {
      console.warn('Не удалось разрешить путь:', rel, e);
      img.src = rel; // fallback
    }
  });


  const triggers = document.querySelectorAll('.js-lightbox-trigger');
  if (triggers.length === 0) return;

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 8;
  const ZOOM_STEP = 1.25;

  // --- Создаем оверлей ---
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

  // --- Применение трансформации ---
  function apply() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLevelEl.textContent = Math.round(scale * 100) + '%';
  }

  // --- Подгонка под экран при открытии ---
  function fitToScreen() {
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fit = Math.min(vw / natW, vh / natH, 1); // не увеличиваем мельче оригинала
    baseWidth = natW * fit;
    baseHeight = natH * fit;

    img.style.width = baseWidth + 'px';
    img.style.height = baseHeight + 'px';

    scale = 1;
    tx = (vw - baseWidth) / 2;
    ty = (vh - baseHeight) / 2;
    apply();
  }

  // --- Ограничение позиции, чтобы картинку не потерять ---
  function clampPosition() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = baseWidth * scale;
    const h = baseHeight * scale;

    // Если картинка меньше вьюпорта — центрируем её по этой оси
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

  // --- Зум относительно точки (cx, cy) ---
  function zoomAt(cx, cy, factor) {
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (newScale === scale) return;

    // Точка под курсором в координатах "мира" до зума
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

  // --- Открытие / закрытие ---
  function openLightbox(src, alt) {
    img.src = src;
    img.alt = alt || '';
    overlay.classList.add('active');
    document.body.classList.add('lightbox-open');
    isOpen = true;

    // Дожидаемся загрузки, чтобы знать naturalWidth/Height
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

  // --- Триггеры ---
  triggers.forEach(t => {
    t.style.cursor = 'zoom-in';
    t.addEventListener('click', e => {
      e.preventDefault();
      openLightbox(t.src, t.alt);
    });
  });

  // --- Управление ---
  overlay.addEventListener('click', e => {
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
    // Клик по пустому фону — закрыть (но не по картинке)
    if (e.target === overlay && !isDragging) {
      closeLightbox();
    }
  });

  // --- Колесо мыши: зум относительно курсора ---
  overlay.addEventListener('wheel', e => {
    if (!isOpen) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // --- Drag ---
  overlay.addEventListener('mousedown', e => {
    if (!isOpen) return;
    if (e.target.closest('[data-action]')) return;
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTx = tx;
    dragStartTy = ty;

    const onMove = ev => {
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

    const onUp = () => {
      overlay.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Сбрасываем флаг после клика, чтобы "click" не закрыл окно
      setTimeout(() => { isDragging = false; }, 0);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // --- Двойной клик: 1x ⇄ 2.5x ---
  overlay.addEventListener('dblclick', e => {
    if (e.target.closest('[data-action]')) return;
    if (scale > 1.1) {
      resetZoom();
    } else {
      zoomAt(e.clientX, e.clientY, 2.5);
    }
  });

  // --- Клавиатура ---
  document.addEventListener('keydown', e => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      // Если увеличено — сначала сбрасываем зум
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

  // --- Touch: pinch-zoom + drag ---
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchCenterX = 0, pinchCenterY = 0;

  overlay.addEventListener('touchstart', e => {
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

  overlay.addEventListener('touchmove', e => {
    if (!isOpen) return;
    e.preventDefault();
    if (e.touches.length === 2 && pinchStartDist > 0) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
        pinchStartScale * (dist / pinchStartDist)));

      // Зум вокруг изначального центра pinch
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

  overlay.addEventListener('touchend', () => {
    pinchStartDist = 0;
  });

  // --- Ресайз окна ---
  window.addEventListener('resize', () => {
    if (!isOpen) return;
    // Пересчитываем базовый размер и подгоняем
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

    // Пропорционально пересчитываем позицию относительно центра
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
```