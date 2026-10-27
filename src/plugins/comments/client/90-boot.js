async function checkAuth() {
  const token = getToken();
  if (!token) { state.isAuthenticated = false; state.email = null; return; }
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) { clearToken(); state.isAuthenticated = false; state.email = null; return; }
    const data = await res.json();
    state.isAuthenticated = true;
    state.email = data.email;
  } catch {
    state.isAuthenticated = false;
    state.email = null;
  }
}

async function loadThreads() {
  try {
    const url = `${API}/threads?page_path=${encodeURIComponent(location.pathname)}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.threads = data.threads || [];
    state.isModerator = !!data.isModerator;
    recompute();
  } catch (e) {
    console.warn('[comments] load failed:', e);
  }
}

function boot() {
  if (!findArticleBody()) { setTimeout(boot, 200); return; }
  checkAuth().then(() => loadThreads());
  setTimeout(recompute, 2000);
  setTimeout(recompute, 4000);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('click', onClickDocument);
  window.addEventListener('popstate', () => setTimeout(loadThreads, 100));
  window.addEventListener('focus', () => loadThreads());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadThreads();
  });
  window.addEventListener('resize', () => {
    if (state.panel) {
      state.panel.style.left = `${document.documentElement.clientWidth - PANEL_WIDTH - 20}px`;
    }
  });
  setInterval(loadThreads, 15_000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();