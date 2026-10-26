// @ts-nocheck
// plugins/roadMap/patchers/mermaid.client.js

/**
 * Инициализирует кликабельность и Pan/Zoom для Mermaid SVG
 */
function initMermaidGantt() {
    const mappingContainers = document.querySelectorAll('.js-gantt-mapping');

    mappingContainers.forEach(container => {
        const parentBlock = container.closest('.gantt-wrapper') || container.parentElement;
        if (!parentBlock) return;

        const setupMermaidFeatures = () => {
            const svg = parentBlock.querySelector('.mermaid svg') || parentBlock.querySelector('svg');
            if (!svg) return false;

            // 1. Кликабельность
            setupClickableNodes(container, svg);

            // 2. Pan & Zoom
            setupPanAndZoom(parentBlock, svg);

            return true;
        };

        if (!setupMermaidFeatures()) {
            const observer = new MutationObserver((_, obs) => {
                if (setupMermaidFeatures()) {
                    obs.disconnect();
                }
            });
            observer.observe(parentBlock, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 5000);
        }
    });
}

function setupClickableNodes(container, svg) {
    const rawMapping = container.getAttribute('data-mapping');
    if (!rawMapping) return;

    let mapping = {};
    try {
        mapping = JSON.parse(rawMapping);
    } catch (e) {
        return;
    }

    Object.keys(mapping).forEach(taskId => {
        const url = mapping[taskId];
        if (!url) return;

        const selectors = [`#${taskId}`, `[id*="${taskId}"]`, `.task#${taskId}`, `[data-id="${taskId}"]`];

        let targetElement = null;
        for (const selector of selectors) {
            targetElement = svg.querySelector(selector);
            if (targetElement) break;
        }

        if (targetElement) {
            targetElement.style.cursor = 'pointer';
            targetElement.classList.add('gantt-node-clickable');
            targetElement.onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                window.open(url, '_blank');
            };
        }
    });
}

function setupPanAndZoom(parentBlock, svg) {
    const btnPan = parentBlock.querySelector('.js-toggle-pan');
    const btnZoom = parentBlock.querySelector('.js-toggle-zoom');

    if (!btnPan || !btnZoom) return;

    // Функция полного подавления всплытия
    const suppressEvent = e => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    };

    // 1. ЖЁСТКАЯ БЛОКИРОВКА ДВОЙНОГО ЩЕЛЧКА
    svg.addEventListener('dblclick', suppressEvent, true);
    parentBlock.addEventListener('dblclick', suppressEvent, true);

    // Состояние трансформации
    let isPanActive = false;
    let isZoomActive = false;
    let isDragging = false;
    let hasMoved = false;
    let startX = 0,
        startY = 0;
    let translateX = 0,
        translateY = 0;
    let scale = 1;

    const updateTransform = () => {
        svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        svg.style.transformOrigin = '0 0';
    };

    btnPan.addEventListener('click', e => {
        e.preventDefault();
        isPanActive = !isPanActive;
        btnPan.classList.toggle('active', isPanActive);
        svg.style.cursor = isPanActive ? 'grab' : 'default';
    });

    btnZoom.addEventListener('click', e => {
        e.preventDefault();
        isZoomActive = !isZoomActive;
        btnZoom.classList.toggle('active', isZoomActive);
    });

    // --- 2. БЛОКИРОВКА POINTER / MOUSE СОБЫТИЙ ДЛЯ ВСТРОЕННЫХ КОНТРОЛОВ ---
    // Diplodoc и svg-pan-zoom слушают pointerdown/pointermove. Глушим их при активном Pan/Zoom
    const interceptPointerEvents = e => {
        if (isPanActive || isDragging) {
            suppressEvent(e);
        }
    };

    svg.addEventListener(
        'pointerdown',
        e => {
            if (isPanActive) {
                isDragging = true;
                hasMoved = false;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                svg.style.cursor = 'grabbing';
                suppressEvent(e);
            }
        },
        true
    );

    window.addEventListener(
        'pointermove',
        e => {
            if (!isDragging || !isPanActive) return;
            hasMoved = true;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
            suppressEvent(e);
        },
        true
    );

    window.addEventListener(
        'pointerup',
        e => {
            if (isDragging) {
                isDragging = false;
                if (isPanActive) svg.style.cursor = 'grab';
                suppressEvent(e);
            }
        },
        true
    );

    // --- 3. DUP НА MOUSE EVENTS (Для старых браузеров / совместимости) ---
    svg.addEventListener(
        'mousedown',
        e => {
            if (isPanActive) {
                isDragging = true;
                hasMoved = false;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                svg.style.cursor = 'grabbing';
                suppressEvent(e);
            }
        },
        true
    );

    window.addEventListener(
        'mousemove',
        e => {
            if (!isDragging || !isPanActive) return;
            hasMoved = true;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
            suppressEvent(e);
        },
        true
    );

    svg.addEventListener(
        'mouseup',
        e => {
            if (isDragging || isPanActive || hasMoved) {
                isDragging = false;
                if (isPanActive) svg.style.cursor = 'grab';
                suppressEvent(e);
            }
        },
        true
    );

    svg.addEventListener(
        'click',
        e => {
            if (hasMoved || isPanActive) {
                suppressEvent(e);
            }
        },
        true
    );

    // --- 4. WHEEL (ZOOM) ---
    svg.addEventListener(
        'wheel',
        e => {
            if (!isZoomActive) return;
            e.preventDefault();

            const zoomFactor = 0.1;
            if (e.deltaY < 0) {
                scale = Math.min(scale + zoomFactor, 5);
            } else {
                scale = Math.max(scale - zoomFactor, 0.2);
            }
            updateTransform();
        },
        { passive: false, capture: true }
    );
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMermaidGantt);
} else {
    initMermaidGantt();
}
