// gosts.js (клиентский скрипт)
(function () {
    function initGostsTable() {
        const container = document.getElementById('gosts-container');
        if (!container) return false;
        if (container.getAttribute('data-gosts-init') === '1') return true;

        const data = window.__GOSTS_DATA__ || [];
        const lang = window.__GOSTS_LANG__ || 'ru'; // Получаем язык для ссылок
        container.setAttribute('data-gosts-init', '1');

        if (data.length === 0) {
            container.innerHTML = '<p>Справочник пуст.</p>';
            return true;
        }

        let state = {
            column: null,
            direction: 'asc',
            openCardId: null,
            handledHash: null,
            flashedHash: null,
        };
        const COLSPAN_COUNT = 5;

        const COLUMNS = [
            { key: 'num', label: '#№ п/п', className: 'col-num' },
            { key: 'code', label: 'Обозначение', className: 'col-code' },
            { key: 'title', label: 'Название', className: 'col-title' },
            { key: 'date', label: 'Дата введения', className: 'col-date' },
            { key: 'status', label: 'Статус', className: 'col-status' }
        ];

        function esc(s) {
            return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
            });
        }

        function formatMarkdown(text) {
            if (!text) return '';
            let safe = esc(text);
            return safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
                const isExternal = url.startsWith('http');
                const targetAttr = isExternal ? ' target="_blank" rel="noopener"' : '';
                return `<a href="${url}"${targetAttr}>${linkText}</a>`;
            });
        }

        function getSortedGroups() {
            const groups = {};
            data.forEach(item => {
                const type = item.type || 'Прочее';
                if (!groups[type]) groups[type] = [];
                groups[type].push(item);
            });

            const sortedTypes = Object.keys(groups).sort();

            for (const type of sortedTypes) {
                const items = groups[type];
                if (state.column && state.direction) {
                    const dir = state.direction === 'asc' ? 1 : -1;
                    const col = state.column;
                    items.sort((a, b) => {
                        const valA = String(a[col] || '');
                        const valB = String(b[col] || '');
                        return valA.localeCompare(valB, 'ru', { numeric: true }) * dir;
                    });
                } else {
                    items.sort((a, b) => String(a.code).localeCompare(String(b.code), 'ru', { numeric: true }));
                }
            }
            return { groups, sortedTypes };
        }

        function indicator(colKey) {
            if (state.column !== colKey || !state.direction) return '';
            return state.direction === 'asc' ? ' \u25B2' : ' \u25BC';
        }

        function onHeaderClick(colKey) {
            if (colKey === 'num') return;
            if (state.column !== colKey) {
                state.column = colKey;
                state.direction = 'asc';
            } else if (state.direction === 'asc') {
                state.direction = 'desc';
            } else {
                state.column = null;
                state.direction = null;
            }
            renderTable();
        }

        function onRowClick(anchorId) {
            if (state.openCardId === anchorId) {
                state.openCardId = null;
            } else {
                state.openCardId = anchorId;
            }
            renderTable();
        }

        function renderTable() {
            const { groups, sortedTypes } = getSortedGroups();
            let totalCount = 0;

            let currentHash = window.location.hash.replace('#', '');
            try { currentHash = decodeURIComponent(currentHash); } catch { }
            const shouldHandleHash = currentHash && currentHash !== state.handledHash;

            let html = '<div class="gost-table-wrapper"><table class="gost-table"><thead><tr>';
            for (let i = 0; i < COLUMNS.length; i++) {
                const c = COLUMNS[i];
                const cls = state.column === c.key ? c.className + ' is-active' : c.className;
                const sortAttr = c.key !== 'num' ? `data-col="${c.key}"` : '';
                html += `<th class="${cls}" ${sortAttr}>${esc(c.label)}<span class="sort-indicator">${indicator(c.key)}</span></th>`;
            }
            html += '</tr></thead><tbody>';

            for (const type of sortedTypes) {
                const items = groups[type];
                let rowNum = 1;

                html += `<tr class="gost-group-header"><td colspan="${COLSPAN_COUNT}">${esc(type)}</td></tr>`;

                for (let j = 0; j < items.length; j++) {
                    const item = items[j];
                    const anchorId = item.anchorId;
                    const isOpen = state.openCardId === anchorId;
                    const isTarget = currentHash === anchorId && state.flashedHash !== currentHash ? 'gost-flash' : '';

                    html += `<tr id="${anchorId}" class="gost-main-row ${isOpen ? 'is-expanded' : ''} ${isTarget}" data-id="${anchorId}">`;
                    html += `<td class="col-num">${rowNum++}</td>`;
                    html += `<td class="col-code"><strong>${formatMarkdown(item.code)}</strong></td>`;
                    html += `<td class="col-title">${formatMarkdown(item.title)}</td>`;
                    html += `<td class="col-date">${formatMarkdown(item.date || '—')}</td>`;
                    html += `<td class="col-status">${formatMarkdown(item.status || '—')}</td>`;
                    html += `</tr>`;

                    html += `<tr class="gost-card-row ${isOpen ? 'is-open' : ''}">`;
                    html += `<td colspan="${COLSPAN_COUNT}">`;
                    html += `<div class="gost-card-wrapper"><div class="gost-card-inner">`;
                    html += `<div class="gost-card-content">`;

                    html += `<div class="gost-card-item"><div class="gost-card-label">Обозначение:</div><div class="gost-card-value">${formatMarkdown(item.code)}</div></div>`;
                    html += `<div class="gost-card-item"><div class="gost-card-label">Тип:</div><div class="gost-card-value">${esc(item.type || '—')}</div></div>`;
                    html += `<div class="gost-card-item"><div class="gost-card-label">Название:</div><div class="gost-card-value">${formatMarkdown(item.title || '—')}</div></div>`;
                    html += `<div class="gost-card-item"><div class="gost-card-label">Дата введения:</div><div class="gost-card-value">${esc(item.date || '—')}</div></div>`;
                    html += `<div class="gost-card-item"><div class="gost-card-label">Статус:</div><div class="gost-card-value">${formatMarkdown(item.status || '—')}</div></div>`;
                    html += `<div class="gost-card-item"><div class="gost-card-label">Доп. информация:</div><div class="gost-card-value">${formatMarkdown(item.description || '—')}</div></div>`;

                    // --- БЛОК ССЫЛАЮЩИХСЯ СТАТЕЙ ---
                    if (item.pages && item.pages.length > 0) {
                        const VISIBLE_LIMIT = 5;

                        //сортируем по алфавиту
                        const sortedPages = [...item.pages].sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru', { numeric: true }));
                        // // Сортируем страницы прямо на клиенте
                        // const sortedPages = [...item.pages].sort((a, b) => {
                        //     if (b.occurrences !== a.occurrences) {
                        //         return b.occurrences - a.occurrences;
                        //     }
                        //     return String(a.title).localeCompare(String(b.title), 'ru', { numeric: true });
                        // });

                        html += `<div class="gost-card-item"><div class="gost-card-label">Ссылаются:</div><div class="gost-card-value">`;
                        html += `<div class="gost-pages-list">`;

                        sortedPages.forEach((page, idx) => { // Используем sortedPages
                            const pageUrl = `/${lang}/${page.href.replace(/\.md$/i, '.html')}#${item.anchorId}`;
                            const isHidden = idx >= VISIBLE_LIMIT ? 'is-hidden' : '';
                            html += `<div class="gost-page-item ${isHidden}">
                                <a href="${pageUrl}" target="_blank">${esc(page.title)}</a>
                                <span class="gost-page-count" title="Количество упоминаний">${page.occurrences}</span>
                            </div>`;
                        });

                        html += `</div>`;

                        if (item.pages.length > VISIBLE_LIMIT) {
                            html += `<button class="gost-pages-toggle" data-expanded="false">больше</button>`;
                        }

                        html += `</div></div>`;
                    }
                    // --------------------------------

                    html += `</div></div></div>`;
                    html += `</td></tr>`;
                }

                html += `<tr class="gost-group-footer"><td colspan="${COLSPAN_COUNT}">Итого по группе ${esc(type)}: ${items.length}</td></tr>`;
                totalCount += items.length;
            }

            html += '</tbody>';
            html += `<tfoot><tr><td colspan="${COLSPAN_COUNT}" class="gost-total-footer">Итого по перечню: ${totalCount}</td></tr></tfoot>`;
            html += '</table></div>';

            container.innerHTML = html;

            // Слушатели для сортировки
            const ths = container.querySelectorAll('th[data-col]');
            for (let k = 0; k < ths.length; k++) {
                ths[k].addEventListener('click', function () { onHeaderClick(this.dataset.col); });
            }

            // Слушатели для раскрытия карточек
            const rows = container.querySelectorAll('.gost-main-row');
            for (let r = 0; r < rows.length; r++) {
                rows[r].addEventListener('click', function () { onRowClick(this.dataset.id); });
            }

            // --- СЛУШАТЕЛИ ДЛЯ КНОПОК "БОЛЬШЕ/МЕНЬШЕ" ---
            const toggleBtns = container.querySelectorAll('.gost-pages-toggle');
            for (let b = 0; b < toggleBtns.length; b++) {
                toggleBtns[b].addEventListener('click', function (e) {
                    e.stopPropagation(); // Предотвращаем закрытие самой карточки ГОСТа

                    const isExpanded = this.getAttribute('data-expanded') === 'true';
                    const list = this.previousElementSibling; // .gost-pages-list
                    const items = list.querySelectorAll('.gost-page-item');
                    const limit = 5;

                    if (!isExpanded) {
                        // Раскрываем: показываем все скрытые
                        for (let i = limit; i < items.length; i++) {
                            items[i].classList.remove('is-hidden');
                        }
                        this.setAttribute('data-expanded', 'true');
                        this.textContent = '[меньше]';
                    } else {
                        // Сворачиваем: скрываем всё после 5-го элемента
                        for (let i = limit; i < items.length; i++) {
                            items[i].classList.add('is-hidden');
                        }
                        this.setAttribute('data-expanded', 'false');
                        this.textContent = '[больше]';
                    }
                });
            }

            // Обработка хэша...
            if (shouldHandleHash) {
                if (document.getElementById(currentHash)) {
                    state.handledHash = currentHash;
                    if (state.openCardId !== currentHash) {
                        state.openCardId = currentHash;
                        renderTable();
                    }
                    state.flashedHash = currentHash;
                    const freshTarget = document.getElementById(currentHash);
                    if (freshTarget) {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                freshTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            });
                        });
                    }
                }
            }
        }

        window.addEventListener('hashchange', function () {
            state.handledHash = null;
            state.flashedHash = null;
            state.openCardId = null;
            renderTable();
        });

        renderTable();
        return true;
    }

    if (!initGostsTable()) {
        let attempts = 0;
        const timer = setInterval(function () {
            attempts++;
            if (initGostsTable() || attempts > 120) clearInterval(timer);
        }, 250);
    }

    if (typeof MutationObserver !== 'undefined' && document.body) {
        const obs = new MutationObserver(function () { initGostsTable(); });
        obs.observe(document.body, { childList: true, subtree: true });
    }
})();