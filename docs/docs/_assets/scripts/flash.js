(function() {
    // Функция для поиска "контейнера рисунка" – поднимаемся от целевого элемента до figure или до p с img
    function getFigureContainer(targetElement) {
        // Ищем ближайший родитель figure
        let figure = targetElement.closest('figure');
        if (figure) return figure;
        
        // Если нет figure, может быть p с img и следующим figure? 
        // Ваша структура: p > img, затем отдельный figure. Тогда можно поискать родительский div или предыдущий p с img.
        // Упростим: ищем предка div.dc-doc-page__body, внутри него – предыдущий p с img.
        let container = targetElement.closest('.yfm, .dc-doc-page__body');
        if (container) {
            // Ищем предыдущий элемент p, который содержит img (это картинка к данному figure)
            let prevImgP = targetElement.previousElementSibling;
            while (prevImgP && prevImgP.tagName !== 'P') {
                prevImgP = prevImgP.previousElementSibling;
            }
            if (prevImgP && prevImgP.querySelector('img')) {
                return prevImgP; // возвращаем p с картинкой
            }
            // Или ищем в родителе любой p с img, находящийся перед figure
            let allP = container.querySelectorAll('p');
            for (let p of allP) {
                if (p.querySelector('img') && p.compareDocumentPosition(targetElement) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    return p;
                }
            }
        }
        // Запасной вариант: вернуть сам figure или родителя figure
        return targetElement.closest('figure') || targetElement.parentNode;
    }

    function applyFlash() {
        if (!window.location.hash) return;
        let targetId = window.location.hash.substring(1); // убираем #
        let targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        let container = getFigureContainer(targetElement);
        if (!container) return;
        
        // Убираем предыдущую анимацию, если она ещё не кончилась
        container.classList.remove('flash-figure');
        // Форсируем перерисовку (необязательно, но надёжнее)
        void container.offsetWidth;
        container.classList.add('flash-figure');
        
        // Через время анимации убираем класс (чтобы можно было снова активировать)
        setTimeout(() => {
            container.classList.remove('flash-figure');
        }, 600);
    }

    // Срабатывает при загрузке страницы
    window.addEventListener('load', applyFlash);
    // Срабатывает при любом изменении хеша (переходе по ссылке внутри документа)
    window.addEventListener('hashchange', applyFlash);
})();