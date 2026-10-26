(function() {
    var mappingEl = document.getElementById('gantt-mapping');
    if (!mappingEl) return;
    var mapping;
    try {
        mapping = JSON.parse(mappingEl.getAttribute('data-mapping'));
    } catch(e) { return; }
    if (!mapping || Object.keys(mapping).length === 0) return;

    function applyClicks() {
        var mermaidDivs = document.querySelectorAll('.mermaid');
        if (mermaidDivs.length === 0) {
            // Если нет .mermaid, возможно, страница ещё не загрузилась
            setTimeout(applyClicks, 500);
            return;
        }
        var found = false;
        mermaidDivs.forEach(function(mermaidDiv) {
            var svg = mermaidDiv.querySelector('svg');
            if (!svg) return;

            svg.on(".zoom", null);

            var textElements = svg.querySelectorAll('text');
            if (textElements.length === 0) {
                // SVG есть, но текстов нет – возможно, ещё не отрендерилось
                setTimeout(applyClicks, 500);
                return;
            }
            textElements.forEach(function(textEl) {
                var text = textEl.textContent.trim();
                var idMatch = text.match(/\[([^\]]+)\]/);
                if (!idMatch) return;
                var id = idMatch[1];
                var url = mapping[id];
                if (!url) return;
                var taskEl = textEl.closest('[class*="task"]');
                if (!taskEl) {
                    taskEl = textEl.closest('g[transform]');
                }
                if (!taskEl) return;
                if (taskEl.dataset.clickApplied) return;
                taskEl.dataset.clickApplied = 'true';
                taskEl.style.cursor = 'pointer';
                taskEl.addEventListener('click', function(e) {
                    window.location.href = url;
                });
                taskEl.setAttribute('title', 'Перейти к деталям');
                found = true;
            });
        });
        if (!found) {
            // Если не нашли ни одного текста с суффиксом, возможно, ещё не готово
            setTimeout(applyClicks, 500);
        }
    }

    // Запускаем applyClicks несколько раз с интервалом
    function scheduleRetry(delay, maxAttempts) {
        var attempts = 0;
        function tryApply() {
            applyClicks();
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(tryApply, delay);
            }
        }
        setTimeout(tryApply, delay);
    }

    // Запускаем при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            scheduleRetry(500, 10); // 10 попыток с интервалом 500 мс
        });
    } else {
        scheduleRetry(500, 10);
    }

    // Также запускаем при переключении вкладок
    var tabsContainer = document.querySelector('.yfm-tabs');
    if (tabsContainer) {
        var panels = tabsContainer.querySelectorAll('.yfm-tab-panel');
        panels.forEach(function(panel) {
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName === 'class') {
                        if (panel.classList.contains('active')) {
                            var title = panel.getAttribute('data-title');
                            if (title && (title.includes('Ганта') || title.includes('Gantt'))) {
                                scheduleRetry(300, 5);
                            }
                        }
                    }
                });
            });
            observer.observe(panel, { attributes: true });
        });
    }

    // Также при изменении размера окна
    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            applyClicks();
        }, 500);
    });
})();