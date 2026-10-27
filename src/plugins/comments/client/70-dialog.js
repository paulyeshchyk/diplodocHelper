function resetDialogState() {
  if (state.dialog) { state.dialog.remove(); state.dialog = null; }
}
function closeDialog() { resetDialogState(); state.pendingRange = null; }

function openDialog({ thread } = {}) {
  resetDialogState();
  if (thread) return;
  const quote = state.pendingRange ? state.pendingRange.toString() : '';
  const needAuth = !state.isAuthenticated && !state.isModerator;

  const authBlock = needAuth ? renderTemplate('auth-block', {
    EMAIL_PH: esc(ui.emailPlaceholder || 'you@company.ru'),
    CODE_PH: esc(ui.claimCodePlaceholder || 'Код от администратора'),
  }) : '';

  const ov = document.createElement('div');
  ov.className = 'dl-comment-overlay';
  ov.innerHTML = renderTemplate('dialog', {
    TITLE: esc(ui.threadTitle || 'Комментарии'),
    QUOTE: esc(quote),
    AUTH_BLOCK: authBlock,
    NAME_PH: esc(ui.namePlaceholder || ''),
    BODY_PH: esc(ui.bodyPlaceholder || ''),
    CANCEL: esc(ui.cancel || 'Отменить'),
    SUBMIT: esc(ui.submit || 'Отправить'),
  });
  document.body.appendChild(ov);

  const els = {
    ov,
    close: ov.querySelector('.dl-comment-dialog__close'),
    cancel: ov.querySelector('.dl-comment-dialog__cancel'),
    submit: ov.querySelector('.dl-comment-dialog__submit'),
    name: ov.querySelector('.dl-comment-dialog__name:not(.dl-comment-dialog__email):not(.dl-comment-dialog__code)'),
    email: ov.querySelector('.dl-comment-dialog__email'),
    code: ov.querySelector('.dl-comment-dialog__code'),
    body: ov.querySelector('.dl-comment-dialog__body'),
    error: ov.querySelector('.dl-comment-dialog__error'),
  };

  const saved = getSavedName();
  if (saved) els.name.value = saved;

  els.submit.addEventListener('click', () => submitNew(els));
  els.close.addEventListener('click', closeDialog);
  els.cancel.addEventListener('click', closeDialog);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeDialog(); });

  if (els.email) els.email.focus();
  else els.body.focus();

  state.dialog = ov;
}

async function submitNew(els) {
  const body = els.body.value.trim();
  if (!body) { els.error.textContent = ui.errorEmpty || ''; els.body.focus(); return; }
  if (!state.pendingRange) { els.error.textContent = ui.errorGeneric || ''; return; }
  const anchor = buildAnchor(state.pendingRange);
  if (!anchor) { els.error.textContent = ui.errorGeneric || ''; return; }

  const name = els.name && els.name.value.trim() ? els.name.value.trim() : null;
  if (name) setSavedName(name);

  const payload = { page_path: location.pathname, anchor, author_name: name, body };

  if (els.email) {
    const email = els.email.value.trim();
    if (!email) { els.error.textContent = ui.errEmailRequired || 'Введите email.'; els.email.focus(); return; }
    payload.email = email;
  }
  if (els.code) {
    const code = els.code.value.trim();
    if (!code) { els.error.textContent = ui.errCodeRequired || 'Введите код.'; els.code.focus(); return; }
    payload.claim_code = code;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token && state.isAuthenticated) headers['Authorization'] = `Bearer ${token}`;

  els.submit.disabled = true;
  els.submit.textContent = ui.submitting || 'Отправка…';
  els.error.textContent = '';

  try {
    const res = await fetch(`${API}/threads`, { method: 'POST', headers, body: JSON.stringify(payload) });

    if (res.status === 401) {
      clearToken();
      state.isAuthenticated = false;
      state.email = null;
      els.error.textContent = ui.errUnauthorized || 'Сессия истекла. Введите email и код заново.';
      els.submit.disabled = false;
      els.submit.textContent = ui.submit || 'Отправить';
      setTimeout(() => {
        const r = state.pendingRange;
        closeDialog();
        if (r) { state.pendingRange = r; openDialog({}); }
      }, 100);
      return;
    }
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      const map = {
        email_not_allowed: ui.errNotAllowed,
        banned: ui.errBanned,
        email_in_use: ui.errInUse,
        bad_code: ui.errBadCode,
        email_required: ui.errEmailRequired,
        claim_code_required: ui.errCodeRequired,
      };
      els.error.textContent = map[data.error] || ui.errorGeneric || '';
      els.submit.disabled = false;
      els.submit.textContent = ui.submit || 'Отправить';
      return;
    }
    if (res.status === 429) {
      els.error.textContent = ui.errRateLimit || 'Слишком много запросов.';
      els.submit.disabled = false;
      els.submit.textContent = ui.submit || 'Отправить';
      return;
    }
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.clone().json()).error || ''; } catch { }
      throw new Error(`HTTP ${res.status}${detail ? ' ' + detail : ''}`);
    }

    const data = await res.json();
    if (data.session_token) {
      setToken(data.session_token);
      state.isAuthenticated = true;
    }

    closeDialog();
    if (data.thread) {
      addThread(data.thread);
      const seg = state.segments.find(s => s.threadIds.includes(data.thread.id));
      let rect = null;
      if (seg) {
        const r = rangeFromOffsets(getRoot(), seg.start, seg.end);
        if (r) rect = r.getBoundingClientRect();
      }
      openPanelForThreads([data.thread.id], rect);
    }
  } catch (e) {
    console.error('[comments] submit failed:', e);
    els.error.textContent = (ui.errorGeneric || 'Ошибка') + ' — ' + e.message;
    els.submit.disabled = false;
    els.submit.textContent = ui.submit || 'Отправить';
  }
}