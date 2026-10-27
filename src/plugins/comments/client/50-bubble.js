function showPopup(rect) {
  hidePopup();
  const el = document.createElement('div');
  el.className = 'dl-comment-popup';
  el.innerHTML = renderTemplate('bubble', {
    TITLE: esc(ui.popupButton || 'Оставить комментарий'),
  });

  const btn = el.querySelector('button');
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
  btn.addEventListener('mouseup', (e) => { e.stopPropagation(); });
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    hidePopup();
    openDialog({});
  });
  document.body.appendChild(el);

  const BUBBLE = 28;
  let top = rect.top - BUBBLE;
  if (top < 8) top = rect.bottom + 2;
  let left = rect.right + 4;   // bubble начинается сразу после конца выделения
  left = Math.max(8, Math.min(window.innerWidth - BUBBLE - 8, left));

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  state.popup = el;
  setTimeout(() => document.addEventListener('mousedown', onDocMouseDown), 0);
}
function hidePopup() {
  if (state.popup) { state.popup.remove(); state.popup = null; }
  document.removeEventListener('mousedown', onDocMouseDown);
}
function onDocMouseDown(e) {
  if (state.popup && !state.popup.contains(e.target)) hidePopup();
}
function onMouseUp() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return hidePopup();
  if (sel.toString().trim().length < 3) return hidePopup();
  const range = sel.getRangeAt(0);
  if (!getRoot().contains(range.commonAncestorContainer)) return hidePopup();

  state.pendingRange = range.cloneRange();

  // Получаем прямоугольники для каждой строки выделения.
  // Берём последний — это конец выделенного текста.
  const rects = range.getClientRects();
  const lastRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

  showPopup(lastRect);
}