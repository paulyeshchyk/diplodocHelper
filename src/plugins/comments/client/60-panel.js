function onClickDocument(e) {
  if (e.button !== 0) return;
  if (e.target.closest('.dl-comment-panel, .dl-comment-dialog, .dl-comment-overlay, .dl-comment-popup')) return;
  if (e.target.closest('a, button, input, textarea, select, label')) return;
  const off = offsetFromPoint(e.clientX, e.clientY);
  if (off == null) return;
  const hits = state.segments.filter(s => s.start <= off && off < s.end);
  if (!hits.length) return;
  openPanel(hits);
}

function openPanel(hits) {
  const root = getRoot();
  const seg = hits[0];
  const range = rangeFromOffsets(root, seg.start, seg.end);
  if (!range) return;
  const rect = range.getBoundingClientRect();
  const ids = [];
  const seen = new Set();
  for (const h of hits) for (const id of h.threadIds) {
    if (!seen.has(id)) { seen.add(id); ids.push(id); }
  }
  openPanelForThreads(ids, rect);
}

function openPanelForThreads(ids, rect) {
  if (!ids.length) return;
  const docTop = rect ? rect.top + window.scrollY : (window.scrollY + 100);
  closePanel();

  const panel = document.createElement('div');
  panel.className = 'dl-comment-panel';
  panel.style.position = 'absolute';
  panel.style.top = `${Math.max(20, docTop)}px`;
  panel.style.left = `${document.documentElement.clientWidth - PANEL_WIDTH - 20}px`;
  panel.style.width = `${PANEL_WIDTH}px`;

  const header = document.createElement('div');
  header.className = 'dl-comment-panel__header';
  header.innerHTML = renderTemplate('panel-header', { TITLE: esc(ui.threadTitle || 'Комментарии') });
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dl-comment-panel__body';
  panel.appendChild(body);

  document.body.appendChild(panel);
  state.panel = panel;
  state.panelThreadIds = ids;
  header.querySelector('.dl-comment-panel__close').addEventListener('click', closePanel);
  rerenderPanel();
}

function closePanel() {
  if (state.panel) { state.panel.remove(); state.panel = null; }
  state.panelThreadIds = null;
}

function rerenderPanel() {
  if (!state.panel || !state.panelThreadIds) return;
  const threads = state.panelThreadIds
    .map(id => state.threads.find(t => t.id === id))
    .filter(Boolean);
  if (!threads.length) { closePanel(); return; }

  const titleEl = state.panel.querySelector('.dl-comment-panel__title');
  if (titleEl) titleEl.textContent = `${ui.threadTitle || 'Комментарии'} (${threads.length})`;

  const body = state.panel.querySelector('.dl-comment-panel__body');
  body.innerHTML = '';
  for (const t of threads) body.appendChild(renderPanelThread(t));
}

function renderPanelThread(t) {
  const wrap = document.createElement('div');
  wrap.className = 'dl-comment-panel__thread';

  const q = document.createElement('div');
  q.className = 'dl-comment-panel__quote';
  q.textContent = '«' + (t.anchor.quote || '') + '»';
  wrap.appendChild(q);

  const msgs = document.createElement('div');
  msgs.className = 'dl-comment-panel__messages';
  for (const c of t.comments) {
    const div = document.createElement('div');
    div.className = 'msg' + (c.is_moderator ? ' msg--mod' : '');
    const author = c.author_name || (c.is_moderator ? 'Технический писатель' : (ui.anonymous || 'Аноним'));
    div.innerHTML = renderTemplate('msg', {
      AUTHOR: esc(author),
      EMAIL_BADGE: c.author_email ? ' ' + esc(c.author_email) : '',
      TIME: esc(new Date(c.created_at).toLocaleString()),
      MOD_LABEL: c.is_moderator ? ' · техпис' : '',
      BODY: esc(c.body),
    });
    msgs.appendChild(div);
  }
  wrap.appendChild(msgs);

  if (t.status === 'open' && state.isModerator) {
    wrap.appendChild(renderModeratorReply(t));
  } else if (t.status === 'open' && !state.isModerator) {
    const notice = document.createElement('div');
    notice.className = 'dl-comment-panel__notice';
    notice.textContent = ui.replyUnavailable || 'Отвечать может только технический писатель.';
    wrap.appendChild(notice);
  } else if (t.status === 'resolved') {
    const actions = document.createElement('div');
    actions.className = 'dl-comment-panel__reply';

    const notice = document.createElement('div');
    notice.className = 'dl-comment-panel__notice';
    notice.textContent = ui.resolvedNotice || 'Тред разрешён. Новые ответы закрыты.';
    actions.appendChild(notice);

    const row = document.createElement('div');
    row.className = 'dl-comment-panel__actions';

    const errEl = document.createElement('div');
    errEl.className = 'dl-comment-panel__error';

    if (state.isModerator) {
      const reopen = document.createElement('button');
      reopen.type = 'button';
      reopen.className = 'dl-comment-panel__btn';
      reopen.textContent = 'Переоткрыть';
      reopen.addEventListener('click', () => onReopen(t, reopen, errEl));
      row.appendChild(reopen);
    }

    const arch = document.createElement('button');
    arch.type = 'button';
    arch.className = 'dl-comment-panel__btn dl-comment-panel__btn--ghost';
    arch.textContent = ui.archive || 'Архивировать';
    arch.title = 'Скрыть этот тред в этом браузере';
    arch.addEventListener('click', () => {
      hideThreadLocal(t.id);
      recompute();
      state.panelThreadIds = state.panelThreadIds.filter(id => id !== t.id);
      if (state.panelThreadIds.length === 0) closePanel();
      else rerenderPanel();
    });
    row.appendChild(arch);

    actions.appendChild(row);
    actions.appendChild(errEl);
    wrap.appendChild(actions);
  }

  return wrap;
}

function renderModeratorReply(t) {
  const box = document.createElement('div');
  box.className = 'dl-comment-panel__reply';
  box.innerHTML = renderTemplate('reply-form', {
    PH: esc('Ответить как технический писатель…'),
    RESOLVE_LABEL: esc('Разрешить после ответа'),
    SUBMIT: esc('Ответить'),
  });

  const ta = box.querySelector('textarea');
  const cb = box.querySelector('.resolve-cb');
  const btn = box.querySelector('.submit-btn');
  const errEl = box.querySelector('.dl-comment-panel__error');

  btn.addEventListener('click', async () => {
    const text = ta.value.trim();
    if (!text) { errEl.textContent = 'Введите ответ.'; ta.focus(); return; }
    btn.disabled = true;
    try {
      const r1 = await fetch(`${API}/comments`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: t.id, body: text }),
      });
      if (!r1.ok) throw new Error('HTTP ' + r1.status);
      if (cb.checked) {
        await fetch(`${API}/threads/${t.id}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'resolved' }),
        });
      }
      await loadThreads();
      rerenderPanel();
    } catch (e) {
      errEl.textContent = 'Ошибка: ' + e.message;
      btn.disabled = false;
    }
  });

  return box;
}

async function onReopen(t, btn, errEl) {
  btn.disabled = true;
  try {
    await fetch(`${API}/threads/${t.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    });
    await loadThreads();
    rerenderPanel();
  } catch (e) {
    if (errEl) errEl.textContent = 'Ошибка: ' + e.message;
    btn.disabled = false;
  }
}