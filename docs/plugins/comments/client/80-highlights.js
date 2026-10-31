function addThread(t) { state.threads.push(t); recompute(); }

function recompute() {
  const root = getRoot();
  const hidden = getHiddenSet();
  const positioned = [];
  for (const t of state.threads) {
    if (t.status === 'archived') continue;
    if (hidden.has(t.id)) continue;
    const pos = findAnchorPositions(root, t.anchor);
    if (!pos) {
      t._orphanChecks = (t._orphanChecks || 0) + 1;
      if (t._orphanChecks >= 3 && !t._orphanReported) {
        t._orphanReported = true;
        fetch(`${API}/threads/${t.id}/orphaned`, { method: 'POST' }).catch(() => { });
      }
      continue;
    }
    t._orphanChecks = 0;
    if (t.orphaned_at) {
      t.orphaned_at = null;
      fetch(`${API}/threads/${t.id}/orphaned`, { method: 'DELETE' }).catch(() => { });
    }
    t._start = pos.start; t._end = pos.end;
    positioned.push(t);
  }
  const points = new Set();
  for (const t of positioned) { points.add(t._start); points.add(t._end); }
  const sorted = [...points].sort((a, b) => a - b);
  const segs = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (a === b) continue;
    const cover = positioned.filter(t => t._start <= a && b <= t._end);
    if (cover.length) segs.push({ start: a, end: b, threadIds: cover.map(t => t.id) });
  }
  state.segments = segs;
  renderHighlights();
}

function renderHighlights() {
  if (!('highlights' in CSS)) {
    console.warn('[comments] CSS Custom Highlight API недоступен в этом браузере — подсветка отключена.');
    return;
  }
  const root = getRoot();
  const openHl = new Highlight();
  const resolvedHl = new Highlight();
  for (const s of state.segments) {
    const r = rangeFromOffsets(root, s.start, s.end);
    if (!r) continue;
    const threads = s.threadIds.map(id => state.threads.find(t => t.id === id)).filter(Boolean);
    const hasOpen = threads.some(t => t.status === 'open');
    (hasOpen ? openHl : resolvedHl).add(r);
  }
  CSS.highlights.set('dl-comment-anchor', openHl);
  CSS.highlights.set('dl-comment-anchor-resolved', resolvedHl);
}