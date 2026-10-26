// @ts-nocheck
// contexts/context-tags.client.js

(function () {
  // Защита от запуска во время сборки на стороне Node.js
  if (typeof window === "undefined") return;

  // Ожидаем переменные, переданные при инъекции
  var items = window.__CONTEXT_ITEMS__ || [];
  var currentLang = window.__CONTEXT_LANG__ || "ru";
  var visibleCount = 5;

  function insertContextTags() {
    var container = document.querySelector(".dc-doc-page__main");
    if (!container) {
      setTimeout(insertContextTags, 300);
      return;
    }
    if (document.getElementById("context-tags-container")) return;

    var style = document.createElement("style");
    style.textContent = [
      ".context-tags-container { margin-top: 2rem; padding: 1rem 0; border-top: 1px solid #eaecef; }",
      ".context-tags-title { font-size: 0.9rem; color: #586069; margin-bottom: 0.5rem; }",
      ".context-tags-list { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }",
      ".context-tag { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 2rem; background-color: #f1f8ff; color: #0366d6; text-decoration: none; font-size: 0.85rem; line-height: 1.8; border: 1px solid #c8e1ff; transition: background 0.2s; }",
      ".context-tag:hover { background-color: #dcecff; text-decoration: none; }",
      ".context-tag-hidden { display: none !important; }",
      ".context-tags-toggle { display: inline-block; padding: 0.2rem 0.8rem; border: 1px solid #d0d7de; border-radius: 2rem; background: #f6f8fa; color: #24292f; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; line-height: 1.8; white-space: nowrap; }",
      ".context-tags-toggle:hover { background: #eaeef2; }",
    ].join("\n");
    document.head.appendChild(style);

    var block = document.createElement("div");
    block.id = "context-tags-container";
    block.className = "context-tags-container";

    var title = document.createElement("div");
    title.className = "context-tags-title";
    title.textContent = currentLang === "ru" ? "Контексты:" : "Contexts:";
    block.appendChild(title);

    var list = document.createElement("div");
    list.className = "context-tags-list";

    var total = items.length;
    var hasMore = total > visibleCount;

    // Сортируем по алфавиту с учётом текущей локали (ru/en).
    // slice() — чтобы не мутировать исходный window.__CONTEXT_ITEMS__
    var sortedItems = items.slice().sort(function (a, b) {
      return a.label.localeCompare(b.label, currentLang, { sensitivity: "base" });
    });

    sortedItems.forEach(function (item, index) {
      var a = document.createElement("a");

      // Ведем сразу на страницу поиска с GET-параметром ?search= ИмяКонтекста
      var targetQuery = encodeURIComponent(item.label);
      //a.href = '/' + currentLang + `/contexts/index.html?search=${targetQuery}`;
      a.href = "/" + currentLang + `/contexts/${targetQuery}.html`;
      a.textContent = item.label;
      a.className = "context-tag";

      if (index >= visibleCount) {
        a.classList.add("context-tag-hidden");
      }
      list.appendChild(a);
    });

    if (hasMore) {
      const moreButtonsCount = total - visibleCount;
      const moreButtonCaption = currentLang === "ru" ? "ещё" : "more";
      const collapseButtonCaption = currentLang === "ru" ? "свернуть" : "collapse";
      var button = document.createElement("button");
      button.textContent = `${moreButtonCaption} ${moreButtonsCount}`;
      button.className = "context-tags-toggle";
      button.addEventListener("click", function () {
        var hidden = list.querySelectorAll(".context-tag-hidden");
        if (hidden.length > 0) {
          hidden.forEach(function (el) {
            el.classList.remove("context-tag-hidden");
          });
          button.textContent = collapseButtonCaption;
        } else {
          var allTags = list.querySelectorAll(".context-tag");
          allTags.forEach(function (el, idx) {
            if (idx >= visibleCount) {
              el.classList.add("context-tag-hidden");
            }
          });
          button.textContent = `${moreButtonCaption} ${moreButtonsCount}`;
        }
      });
      list.appendChild(button);
    }

    block.appendChild(list);

    var nav = container.querySelector(".dc-doc-navigation, .dc-doc-footer, nav:last-child");
    if (nav) {
      container.insertBefore(block, nav);
    } else {
      container.appendChild(block);
    }
  }

  insertContextTags();
})();
