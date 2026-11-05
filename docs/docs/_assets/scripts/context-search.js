// @ts-nocheck
// context-search.client.js

(function () {
    if (typeof window === 'undefined') return;

    var contextData = null; // будет заполнено после загрузки JSON
    var dataLoaded = false;
    var pendingInit = [];

    const DATASET_FILENAME = 'app-help-contents.json';

    // --- Загрузка данных из app-help-contents.json ---
    function loadSearchData(callback) {
        if (dataLoaded) {
            callback(contextData);
            return;
        }
        pendingInit.push(callback);
        if (pendingInit.length > 1) return; // уже идёт загрузка

        // Определяем путь к JSON (скрипт в _assets/scripts/, JSON в корне build)
        var jsonUrl = '../' + DATASET_FILENAME;
        var scriptTag = document.currentScript;
        if (scriptTag) {
            var baseUrl = scriptTag.src.replace(/\/[^/]*$/, '/');
            jsonUrl = baseUrl + '../../' + DATASET_FILENAME;
        }

        fetch(jsonUrl)
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (entries) {
                // Преобразуем массив записей в структуру { ru: [...], en: [...] }
                var data = buildSearchDataFromAppHelp(entries);
                contextData = data;
                dataLoaded = true;
                pendingInit.forEach(function (cb) {
                    cb(contextData);
                });
                pendingInit = [];
            })
            .catch(function (err) {
                console.error('❌ Ошибка загрузки данных поиска:', err);
                // В случае ошибки используем пустые данные, чтобы скрипт не падал
                contextData = { ru: [], en: [] };
                dataLoaded = true;
                pendingInit.forEach(function (cb) {
                    cb(contextData);
                });
                pendingInit = [];
            });
    }

    function buildSearchDataFromAppHelp(entries) {
        var result = { ru: [], en: [] };
        entries.forEach(function (entry) {
            // Нормализуем язык: берём первые два символа, приводим к нижнему регистру
            var lang = (entry.lang || '').substring(0, 2).toLowerCase();
            // Если язык не ru или en – пропускаем запись (можно также записывать в оба, но лучше пропустить)
            if (lang !== 'ru' && lang !== 'en') {
                return;
            }
            // Парсим контексты (строка через запятую)
            var contexts = entry.context
                ? entry.context
                      .split(',')
                      .map(function (s) {
                          return s.trim();
                      })
                      .filter(function (s) {
                          return s.length > 0;
                      })
                : [];
            // Нормализуем URL: убираем .md, добавляем .html, убираем ведущий слеш
            var href = entry.url.replace(/\.md$/, '.html');
            if (href.startsWith('/')) href = href.substring(1);
            result[lang].push({
                href: href,
                title: entry.title,
                size: entry.size || 0,
                contexts: contexts,
            });
        });
        return result;
    }

    // --- Остальные функции (почти без изменений, но используют переданные данные) ---

    var noResultsMsg = {
        ru: 'Нет статей, содержащих все указанные контексты.',
        en: 'No articles contain all specified contexts.',
    };

    function getAllContexts(lang, data) {
        var pages = data[lang] || [];
        var ctxSet = {};
        pages.forEach(function (p) {
            p.contexts.forEach(function (ctx) {
                ctxSet[ctx] = true;
            });
        });
        return Object.keys(ctxSet).sort();
    }

    function initSearch(container, lang, data) {
        var input = container.querySelector('#search-input');
        var results = container.querySelector('#search-results');
        if (!input || !results) return;

        var pages = data[lang] || [];
        var allContexts = getAllContexts(lang, data);

        var hintDiv = document.createElement('div');
        hintDiv.id = 'search-hint';
        hintDiv.className = 'search-hint';

        var summaryDiv = document.createElement('div');
        summaryDiv.id = 'search-summary';
        summaryDiv.className = 'search-summary';

        results.parentNode.insertBefore(hintDiv, results);
        results.parentNode.insertBefore(summaryDiv, results);

        function formatSize(bytes) {
            if (typeof bytes !== 'number' || bytes < 0) return '';
            if (bytes === 0) return '0 Б';
            var units = ['Б', 'КБ', 'МБ'];
            var value = bytes;
            var unitIndex = 0;
            while (value >= 1024 && unitIndex < units.length - 1) {
                value /= 1024;
                unitIndex++;
            }
            var display;
            if (unitIndex === 0) display = Math.round(value);
            else display = value >= 10 ? Math.round(value) : value.toFixed(1);
            return display + ' ' + units[unitIndex];
        }

        function updateHint() {
            var query = input.value;
            var words = query.split(/\s+/);
            var lastWord = words[words.length - 1] || '';
            if (lastWord.length === 0) {
                hintDiv.innerHTML = '';
                return;
            }
            var matches = allContexts.filter(function (ctx) {
                return ctx.toLowerCase().indexOf(lastWord.toLowerCase()) === 0;
            });
            if (matches.length === 0) {
                hintDiv.innerHTML = '';
                return;
            }
            var display = matches.slice(0, 5);
            var more = matches.length > 5 ? ' ...' : '';
            var hintHtml = lang === 'ru' ? 'Возможно, вы имели в виду: ' : 'Did you mean: ';
            display.forEach(function (ctx) {
                hintHtml += '<span class="hint-chip" data-context="' + ctx + '">' + ctx + '</span>';
            });
            hintHtml += more;
            hintDiv.innerHTML = hintHtml;
        }

        function search() {
            var query = input.value.trim().toLowerCase();
            var terms = query.split(/\s+/).filter(function (t) {
                return t.length > 0;
            });
            if (terms.length === 0) {
                results.innerHTML = '';
                summaryDiv.textContent = '';
                hintDiv.innerHTML = '';
                return;
            }
            var matched = pages.filter(function (page) {
                var pageContexts = page.contexts.map(function (c) {
                    return c.toLowerCase();
                });
                return terms.every(function (term) {
                    return pageContexts.some(function (c) {
                        return c === term;
                    });
                });
            });

            summaryDiv.textContent = (lang === 'ru' ? 'Найдено статей:' : 'Found articles:') + ' ' + matched.length;
            if (matched.length === 0) {
                results.innerHTML = '<p>' + noResultsMsg[lang] + '</p>';
            } else {
                var html = '<ul style="list-style:none; padding:0; margin:0;">';
                matched.forEach(function (p) {
                    var href = p.href.replace(/\.md$/, '.html');
                    var sizeStr = formatSize(p.size);
                    html += '<li class="result-item">';
                    html +=
                        '<div class="result-title"><a href="' +
                        href +
                        '">' +
                        p.title +
                        '</a> <span class="result-size">(' +
                        sizeStr +
                        ')</span></div>';
                    html += '<div class="result-tags">';
                    var contexts = p.contexts || [];
                    contexts.forEach(function (ctx) {
                        var isActive = terms.indexOf(ctx.toLowerCase()) !== -1;
                        var activeClass = isActive ? ' context-chip-active' : '';
                        html +=
                            '<span class="context-chip' +
                            activeClass +
                            '" data-context="' +
                            ctx +
                            '">' +
                            ctx +
                            '</span>';
                    });
                    html += '</div>';
                    html += '</li>';
                });
                html += '</ul>';
                results.innerHTML = html;
            }
        }

        function removeContextFromQuery(context) {
            var current = input.value;
            var words = current.split(/\s+/).filter(function (w) {
                return w.length > 0;
            });
            var lowerContext = context.toLowerCase();
            var newWords = words.filter(function (w) {
                return w.toLowerCase() !== lowerContext;
            });
            var newValue = newWords.join(' ');
            input.value = newValue;

            if (newValue.trim() === '') {
                results.innerHTML = '';
                summaryDiv.textContent = '';
                hintDiv.innerHTML = '';
                return;
            }

            updateHint();
            search();
        }

        function addContextToQuery(context) {
            var current = input.value.trim();
            if (current === '') {
                input.value = context + ' ';
            } else {
                // Если строка не заканчивается пробелом, добавляем пробел перед контекстом и после
                if (!current.endsWith(' ')) {
                    input.value = current + ' ' + context + ' ';
                } else {
                    input.value = current + context + ' ';
                }
            }
            // Явно очищаем хинт, так как ввод завершён
            hintDiv.innerHTML = '';
            // Обновляем результаты
            search();
        }

        input.addEventListener('keydown', function (e) {
            var key = e.key;
            if (key === ' ' || key === 'Enter' || key === 'Tab') {
                if (key === 'Tab') e.preventDefault();
                updateHint();
                search();
            }
        });

        input.addEventListener('input', function () {
            if (input.value.trim() === '') {
                results.innerHTML = '';
                summaryDiv.textContent = '';
                hintDiv.innerHTML = '';
                return;
            }
            updateHint();
        });

        input.addEventListener('paste', function (e) {
            setTimeout(function () {
                updateHint();
                search();
            }, 10);
        });

        results.addEventListener('click', function (e) {
            var chip = e.target.closest('.context-chip');
            if (!chip) return;
            var context = chip.dataset.context;
            if (chip.classList.contains('context-chip-active')) {
                removeContextFromQuery(context);
            } else {
                addContextToQuery(context);
            }
        });
        hintDiv.addEventListener('click', function (e) {
            var chip = e.target.closest('.hint-chip');
            if (chip) {
                var context = chip.dataset.context;
                var current = input.value;
                var words = current.split(/\s+/);
                if (words.length > 0 && words[words.length - 1] !== '') words.pop();
                words.push(context);
                input.value = words.join(' ');
                hintDiv.innerHTML = '';
                search();
            }
        });
    }

    function getLang() {
        var path = window.location.pathname;
        var match = path.match(/^\/(ru|en)\//);
        return match ? match[1] : 'ru';
    }

    function findSearchPanel() {
        var panels = document.querySelectorAll('.yfm-tab-panel');
        for (var i = 0; i < panels.length; i++) {
            var panel = panels[i];
            if (panel.getAttribute('data-title') === 'Поиск' || panel.getAttribute('data-title') === 'Search') {
                return panel;
            }
        }
        return null;
    }

    function initializeSearch() {
        loadSearchData(function (data) {
            doInitializeSearch(data);
        });
    }

    function doInitializeSearch(data) {
        var panel = findSearchPanel();
        if (!panel) return;

        var container = panel.querySelector('#context-search-container');
        if (!container) {
            var lang = getLang();
            var placeholder =
                lang === 'ru' ? 'Введите контексты через пробел...' : 'Enter contexts separated by space...';

            container = document.createElement('div');
            container.id = 'context-search-container';
            container.className = 'context-search-container';
            container.dataset.lang = lang;

            var input = document.createElement('input');
            input.type = 'text';
            input.id = 'search-input';
            input.placeholder = placeholder;
            input.className = 'search-input';

            var resultsDiv = document.createElement('div');
            resultsDiv.id = 'search-results';
            resultsDiv.className = 'search-results';

            container.appendChild(input);
            container.appendChild(resultsDiv);
            panel.appendChild(container);
        }

        if (container.dataset.initialized === 'true') return;
        container.dataset.initialized = 'true';

        var datasetlang = container.dataset.lang || getLang();

        // Удаляем старые hint/summary, если были
        var oldHint = container.querySelector('#search-hint');
        var oldSummary = container.querySelector('#search-summary');
        if (oldHint) oldHint.remove();
        if (oldSummary) oldSummary.remove();

        initSearch(container, datasetlang, data);
    }

    function tryInitialize() {
        var panel = findSearchPanel();
        if (panel && !panel.dataset.searchInitialized) {
            initializeSearch();
        }
    }

    // Первоначальный запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInitialize);
    } else {
        tryInitialize();
    }

    // Наблюдатель за изменениями DOM – вызовет tryInitialize при появлении новых элементов
    var observer = new MutationObserver(function () {
        tryInitialize();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
