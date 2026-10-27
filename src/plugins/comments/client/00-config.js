if (typeof window === 'undefined') return;

const cfg = window.__DL_COMMENTS_CFG__ || {};
const ui = cfg.ui || {};
const API = (cfg.apiBase || '/api').replace(/\/+$/, '');
const LANG = cfg.lang || 'ru';
const PANEL_WIDTH = 360;