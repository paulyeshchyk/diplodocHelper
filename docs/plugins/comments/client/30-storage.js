const TOKEN_KEY = 'dl-comment-token';
const HIDDEN_KEY = 'dl-comments-hidden';
const NAME_KEY = 'dl-comment-name';

function getHiddenSet() {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')); }
  catch { return new Set(); }
}
function hideThreadLocal(id) {
  const s = getHiddenSet(); s.add(id);
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s])); } catch { }
}
function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch { } }
function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch { } }
function getSavedName() { try { return localStorage.getItem(NAME_KEY); } catch { return null; } }
function setSavedName(n) { try { localStorage.setItem(NAME_KEY, n); } catch { } }