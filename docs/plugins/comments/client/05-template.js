function renderTemplate(name, data) {
  const el = document.getElementById('dl-tpl-' + name);
  if (!el) { console.warn('[comments] template not found:', name); return ''; }
  const tpl = el.textContent || '';
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) =>
    data && data[k] != null ? String(data[k]) : ''
  );
}