// @ts-nocheck
// clean-mode.js

(function () {
  // === Проверка флага из storage или query-параметра ===
  const urlParams = new URLSearchParams(window.location.search);
  const hasCleanParam = urlParams.has('clean') || urlParams.get('mode') === 'embed';

  if (hasCleanParam) {
    sessionStorage.setItem('diplodoc_clean_mode', 'true');
  }

  const isCleanMode = sessionStorage.getItem('diplodoc_clean_mode') === 'true';

  if (!isCleanMode) return;

  console.log('[Diplodoc Clean Mode] Activated');

  function hideNavigation() {
    // Основная левая колонка
    document.querySelectorAll('.dc-doc-layout__left').forEach(el => {
      el.style.cssText = `
                visibility: hidden !important;
                width: 0 !important;
                min-width: 0 !important;
                max-width: 0 !important;
                flex: 0 0 0 !important;
                overflow: hidden !important;
                padding: 0 !important;
                margin: 0 !important;
            `;
    });

    // Дополнительные сайдбары
    document
      .querySelectorAll('.dc-sidebar, .dc-doc-layout__sidebar, [class*="sidebar"]')
      .forEach(el => (el.style.display = 'none'));

    // Расширяем контент
    document
      .querySelectorAll('.dc-doc-layout__right, .dc-doc-page__main, .dc-doc-page, main')
      .forEach(el => {
        el.style.cssText = `
                    margin-left: 0 !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    flex: 1 1 auto !important;
                `;
      });

    // Хлебные крошки
    document
      .querySelectorAll('.dc-breadcrumb, [class*="breadcrumb"]')
      .forEach(el => (el.style.display = 'none'));
  }

  // Многократный запуск
  hideNavigation();
  setTimeout(hideNavigation, 300);
  setTimeout(hideNavigation, 700);
  setTimeout(hideNavigation, 1200);
  setTimeout(hideNavigation, 2000);

  // Лёгкий observer
  const observer = new MutationObserver(hideNavigation);
  observer.observe(document.body, { childList: true, subtree: true });

  // На события навигации
  window.addEventListener('hashchange', hideNavigation);
  window.addEventListener('popstate', hideNavigation);

  console.log('[Diplodoc Clean Mode] Persistent mode enabled');
})();
