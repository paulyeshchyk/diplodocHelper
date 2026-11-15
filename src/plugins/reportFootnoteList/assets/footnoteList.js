(function () {
  if (typeof footnotesData === 'undefined') return;

  var items = (footnotesData && footnotesData.items) || [];
  var state = { column: null, direction: null };

  var COLUMNS = [
    { key: 'number', label: 'Номер', className: 'col-number' },
    { key: 'text', label: 'Текст сноски', className: 'col-text' },
    { key: 'article', label: 'Применяемость сноски', className: 'col-article' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Очистка текста от вложенных тегов <a>/</a>
  function stripLinks(htmlStr) {
    return String(htmlStr || '').replace(/<\/?a\b[^>]*>/gi, '');
  }

  // Безопасное формирование ячейки-ссылки
  function formatCellContent(url, text) {
    if (!url) return text || '';
    var cleanText = stripLinks(text);
    return '<a class="cell-link" href="' + esc(url) + '">' + cleanText + '</a>';
  }

  function sorted() {
    if (!state.column || !state.direction) return items.slice();
    var dir = state.direction === 'asc' ? 1 : -1;
    var col = state.column;
    return items.slice().sort(function (a, b) {
      if (col === 'number') return (a.number - b.number) * dir;
      return String(a[col] || '').localeCompare(String(b[col] || ''), 'ru') * dir;
    });
  }

  function indicator(colKey) {
    if (state.column !== colKey || !state.direction) return '';
    return state.direction === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  function onHeaderClick(colKey) {
    if (state.column !== colKey) { state.column = colKey; state.direction = 'asc'; }
    else if (state.direction === 'asc') { state.direction = 'desc'; }
    else { state.column = null; state.direction = null; }
    renderTable();
  }

  function renderTable() {
    var container = document.getElementById('footnotes-container');
    if (!container) return;

    var rows = sorted();
    var html = '<div class="footnote-meta">Всего сносок: ' + rows.length + '</div>';
    html += '<table class="footnote-table"><thead><tr>';
    for (var i = 0; i < COLUMNS.length; i++) {
      var c = COLUMNS[i];
      var cls = state.column === c.key ? c.className + ' is-active' : c.className;
      html += '<th class="' + cls + '" data-col="' + c.key + '">' +
        esc(c.label) +
        '<span class="sort-indicator">' + indicator(c.key) + '</span>' +
        '</th>';
    }
    html += '</tr></thead><tbody>';

    for (var j = 0; j < rows.length; j++) {
      var it = rows[j];

      var textCell = formatCellContent(it.refUrl, it.text);
      var articleCell = formatCellContent(it.url, it.article);

      html += '<tr>' +
        '<td class="col-number">' + esc(it.number) + '</td>' +
        '<td class="col-text">' + textCell + '</td>' +
        '<td class="col-article">' + articleCell + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';

    container.innerHTML = html;

    var ths = container.querySelectorAll('th[data-col]');
    for (var k = 0; k < ths.length; k++) {
      (function (th) {
        th.addEventListener('click', function () { onHeaderClick(th.dataset.col); });
      })(ths[k]);
    }
  }

  function findArticleBody() {
    return document.querySelector('.dc-doc-page__body')
      || document.querySelector('.dc-doc-page__content')
      || document.querySelector('.dc-doc-page__main')
      || document.querySelector('main');
  }

  function ensureContainer() {
    var body = findArticleBody();
    if (!body) return null;

    var c = document.getElementById('footnotes-container');
    if (c) return c;

    c = document.createElement('div');
    c.id = 'footnotes-container';
    body.appendChild(c);
    return c;
  }

  function tick() {
    var c = ensureContainer();
    if (!c) return false;
    if (!c.querySelector('.footnote-table')) renderTable();
    return true;
  }

  // Первая попытка + периодические до 15 секунд.
  if (!tick()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (tick() || attempts > 60) clearInterval(timer);
    }, 250);
  }

  // Если React перерисует дерево — контейнер пропадёт, вернём.
  var obs = new MutationObserver(function () {
    if (!document.getElementById('footnotes-container')) tick();
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();