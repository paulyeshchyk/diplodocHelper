/* eslint-disable no-undef */
// @ts-nocheck
// plugins/roadMap/assets/gantt-runtime.js

(function () {
    function loadScript(src, callback) {
        if (window.svgPanZoom) {
            callback();
            return;
        }
        var script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        document.head.appendChild(script);
    }

    function initPanZoom() {
        if (!window.svgPanZoom) return;

        var wrappers = document.querySelectorAll('.gantt-wrapper');

        wrappers.forEach(function (wrapper) {
            var container = wrapper.querySelector('.gantt-raw-container');
            var svg = container ? container.querySelector('svg') : null;
            if (!svg || svg.dataset.panZoomInitialized) return;

            var btnPan = wrapper.querySelector('.js-toggle-pan');
            var btnZoom = wrapper.querySelector('.js-toggle-zoom');

            // Кнопки масштабирования
            var btnFitWidth = wrapper.querySelector('.js-fit-width');
            var btnFitHeight = wrapper.querySelector('.js-fit-height');
            var btnFitBoth = wrapper.querySelector('.js-fit-both');

            var isPanEnabled = false;
            var isZoomEnabled = false;

            var panZoomInstance = svgPanZoom(svg, {
                panEnabled: isPanEnabled,
                zoomEnabled: isZoomEnabled,
                controlIconsEnabled: true,
                fit: false,
                center: false,
                minZoom: 0.05,
                maxZoom: 15,
                zoomScaleSensitivity: 0.2,
            });

            // Хелпер получения исходных размеров SVG из viewBox
            function getSvgNativeSizes() {
                // 1. Пробуем извлечь viewBox, если он задан
                if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
                    return {
                        width: svg.viewBox.baseVal.width,
                        height: svg.viewBox.baseVal.height,
                    };
                }

                // 2. У PlantUML корневой граф обычно лежит в первом <g> внутри <g class="svg-pan-zoom_viewport">
                var viewport = svg.querySelector('.svg-pan-zoom_viewport');
                if (viewport) {
                    var bbox = viewport.getBBox();
                    if (bbox && bbox.width > 0) {
                        return { width: bbox.width, height: bbox.height };
                    }
                }

                // 3. Запасной вариант через атрибуты width/height самого SVG (парсим pt/px)
                var svgWidth = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
                var svgHeight = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;

                return { width: svgWidth, height: svgHeight };
            }

            // --- ФУНКЦИИ ВПИСЫВАНИЯ НА КНОПКИ ---

            function fitWidth() {
                var nativeSize = getSvgNativeSizes();

                // Берем чистую внутреннюю ширину контейнера (без учитывания полос прокрутки)
                var containerWidth = container.clientWidth;

                if (!nativeSize.width || !containerWidth) return;

                // Рассчитываем точный масштаб
                var targetScale = containerWidth / nativeSize.width;

                // Устанавливаем Zoom по оси X и сбрасываем Pan в ноль
                panZoomInstance.zoom(targetScale);
                panZoomInstance.pan({ x: 0, y: 0 });
            }

            function fitHeight() {
                var nativeSize = getSvgNativeSizes();
                var containerHeight = container.clientHeight;

                if (!nativeSize.height || !containerHeight) return;

                var targetScale = containerHeight / nativeSize.height;

                panZoomInstance.zoom(targetScale);
                panZoomInstance.pan({ x: 0, y: 0 });
            }

            function fitBoth() {
                panZoomInstance.fit();
                panZoomInstance.center();
            }

            function alignToTopLeft() {
                panZoomInstance.resetZoom();
                panZoomInstance.pan({ x: 0, y: 0 });
            }

            // Начальная позиция
            alignToTopLeft();
            svg.dataset.panZoomInitialized = 'true';

            // --- ОБРАБОТЧИКИ СОСТОЯНИЙ ---

            if (btnPan) {
                btnPan.addEventListener('click', function () {
                    isPanEnabled = !isPanEnabled;
                    if (isPanEnabled) {
                        panZoomInstance.enablePan();
                        btnPan.classList.add('active');
                    } else {
                        panZoomInstance.disablePan();
                        btnPan.classList.remove('active');
                    }
                });
            }

            if (btnZoom) {
                btnZoom.addEventListener('click', function () {
                    isZoomEnabled = !isZoomEnabled;
                    if (isZoomEnabled) {
                        panZoomInstance.enableZoom();
                        btnZoom.classList.add('active');
                    } else {
                        panZoomInstance.disableZoom();
                        btnZoom.classList.remove('active');
                    }
                });
            }

            // --- ОБРАБОТЧИКИ КНОПОК МАСШТАБА ---

            if (btnFitWidth) {
                btnFitWidth.addEventListener('click', fitWidth);
            }

            if (btnFitHeight) {
                btnFitHeight.addEventListener('click', fitHeight);
            }

            if (btnFitBoth) {
                btnFitBoth.addEventListener('click', fitBoth);
            }

            // Не блокируем скролл страницы, если zoom выключен
            container.addEventListener(
                'wheel',
                function (e) {
                    if (!isZoomEnabled) {
                        e.stopPropagation();
                    }
                },
                true
            );

            window.addEventListener('resize', function () {
                panZoomInstance.resize();
            });
        });
    }

    function setup() {
        loadScript('https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js', function () {
            initPanZoom();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }

    // Сброс и подгонка при кликах по табам Diplodoc
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('yfm-tab')) {
            setTimeout(function () {
                var containers = document.querySelectorAll('.gantt-raw-container');
                containers.forEach(function (container) {
                    var svg = container.querySelector('svg');
                    if (svg && window.svgPanZoom) {
                        var instance = svgPanZoom(svg);
                        if (instance) {
                            instance.resize();
                        } else {
                            initPanZoom();
                        }
                    }
                });
            }, 100);
        }
    });
})();
