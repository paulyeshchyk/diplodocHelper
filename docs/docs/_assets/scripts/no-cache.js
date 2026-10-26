// 1. Добавляем мета-теги для отключения кэширования
function addNoCacheMetaTags() {
  const metaTags = [
    { 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
    { 'http-equiv': 'Pragma', content: 'no-cache' },
    { 'http-equiv': 'Expires', content: '0' }
  ];

  metaTags.forEach(tagData => {
    const meta = document.createElement('meta');
    for (let key in tagData) {
      meta.setAttribute(key, tagData[key]);
    }
    document.head.appendChild(meta);
  });
}

// 2. Перехватываем навигацию и добавляем к ссылкам уникальный параметр
function addCacheBusterToLinks() {
  const cacheBuster = Date.now();
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.href, window.location.origin);
    if (url.origin === window.location.origin) {
      url.searchParams.set('_t', cacheBuster);
      link.href = url.toString();
    }
  });
}

// Запускаем функции после полной загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    addNoCacheMetaTags();
    addCacheBusterToLinks();
  });
} else {
  addNoCacheMetaTags();
  addCacheBusterToLinks();
}