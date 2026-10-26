(function () {
    var STORAGE_KEY = 'diplodoc.figures.view';
    var VALID = ['list', 'grid'];

    function getSaved() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return VALID.indexOf(v) !== -1 ? v : 'list';
        } catch (e) { return 'list'; }
    }

    function save(view) {
        try { localStorage.setItem(STORAGE_KEY, view); } catch (e) { /* ignore */ }
    }

    function applyView(view) {
        var container = document.querySelector('.figures-container');
        if (!container) return;
        container.setAttribute('data-view', view);

        var buttons = document.querySelectorAll('[data-figures-view]');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var active = btn.getAttribute('data-figures-view') === view;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    }

    function initIfNeeded() {
        var container = document.querySelector('.figures-container');
        if (!container) return;

        var saved = getSaved();
        // Всегда выравниваем вид контейнера под сохранённый,
        // даже если React уже поставил что-то своё.
        if (container.getAttribute('data-view') !== saved) {
            applyView(saved);
        } else {
            // data-view совпал — но кнопки могли перерисоваться,
            // прогоняем их отдельно.
            var buttons = document.querySelectorAll('[data-figures-view]');
            for (var i = 0; i < buttons.length; i++) {
                var b = buttons[i];
                var active = b.getAttribute('data-figures-view') === saved;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', active ? 'true' : 'false');
            }
        }
    }

    // Делегирование: клик ловим на уровне документа,
    // поэтому кнопки могут пересоздаваться React'ом — нам всё равно.
    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-figures-view]');
        if (!btn) return;
        var view = btn.getAttribute('data-figures-view');
        if (VALID.indexOf(view) === -1) return;
        applyView(view);
        save(view);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIfNeeded);
    } else {
        initIfNeeded();
    }

    // Diplodoc/React рендерит тело страницы асинхронно — ловим момент.
    var observer = new MutationObserver(function () {
        initIfNeeded();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();