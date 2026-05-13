// breadcrumb-script/inject-breadcrumb.js
const fs = require('fs');
const path = require('path');

// ========== НАСТРОЙКИ ==========
const CONFIG = {
    buildDir: './build',                // папка сборки (относительно этого файла)
    separator: ' ',                     // разделитель
    templateFile: './inject-breadcrumb-body.js', // путь к шаблону
    cssClasses: {
        nav: 'dc-breadcrumb',
        list: 'dc-breadcrumb__list',
        item: 'dc-breadcrumb__item',
        link: 'dc-breadcrumb__link',
        separator: 'dc-breadcrumb__separator'
    },
    ignoreFiles: ['404.html', 'search.html'],
    containerSelector: '.dc-doc-page__main'
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function walkHtmlFiles(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) walkHtmlFiles(fullPath, callback);
        else if (file.endsWith('.html')) callback(fullPath);
    }
}

function extractTitleFromHtml(html) {
    const stateMatch = html.match(/<script\s+id="diplodoc-state"[^>]*>([\s\S]*?)<\/script>/);
    if (stateMatch) {
        try {
            const state = JSON.parse(stateMatch[1]);
            if (state.data?.title) return state.data.title;
            if (state.title) return state.title;
        } catch (e) {}
    }
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    return titleMatch ? titleMatch[1].trim() : null;
}

function buildTitleMap(buildDir) {
    const titleMap = new Map();
    console.log('Сбор заголовков страниц...');
    walkHtmlFiles(buildDir, (htmlPath) => {
        const fileName = path.basename(htmlPath);
        if (CONFIG.ignoreFiles.includes(fileName)) return;
        if (fileName === 'index.html' && path.dirname(htmlPath) === buildDir) return;

        const content = fs.readFileSync(htmlPath, 'utf8');
        const title = extractTitleFromHtml(content);
        if (title) {
            const rel = path.relative(buildDir, htmlPath).replace(/\\/g, '/');
            titleMap.set(rel, title);
        }
    });
    console.log(`Собрано ${titleMap.size} заголовков.`);
    return titleMap;
}

function generateBreadcrumbScript(htmlPath, titleMap, config) {
    const relPath = path.relative(config.buildDir, htmlPath).replace(/\\/g, '/');
    let withoutHtml = relPath.replace(/\.html$/, '');
    if (withoutHtml === '' || withoutHtml === 'index') return null;
    let segments = withoutHtml.split('/').filter(s => s && s !== 'index');
    if (segments.length < 2) return null;

    const lang = segments[0];
    const parentSegments = segments.slice(1, -1);
    if (parentSegments.length === 0) return null;

    // Читаем шаблон
    let template = fs.readFileSync(path.join(__dirname, config.templateFile), 'utf8');

    // Подготавливаем данные для замены
    const titlesJson = JSON.stringify(Object.fromEntries(titleMap));
    const separatorJson = JSON.stringify(config.separator);
    const classesJson = JSON.stringify(config.cssClasses);
    const containerSelectorJson = JSON.stringify(config.containerSelector);
    const langJson = JSON.stringify(lang);
    const parentSegmentsJson = JSON.stringify(parentSegments);

    // Заменяем плейсхолдеры
    template = template
        .replace('{{TITLES_MAP}}', titlesJson)
        .replace('{{SEPARATOR}}', separatorJson)
        .replace('{{CLASSES}}', classesJson)
        .replace('{{CONTAINER_SELECTOR}}', containerSelectorJson)
        .replace('{{LANG}}', langJson)
        .replace('{{PARENT_SEGMENTS}}', parentSegmentsJson);

    return template;
}

function injectScriptIntoFile(htmlPath, titleMap, config) {
    const fileName = path.basename(htmlPath);
    if (config.ignoreFiles.includes(fileName)) {
        console.log(`Игнорируем служебный: ${htmlPath}`);
        return;
    }
    if (fileName === 'index.html' && path.dirname(htmlPath) === config.buildDir) {
        console.log(`Пропускаем корневой index.html: ${htmlPath}`);
        return;
    }

    const script = generateBreadcrumbScript(htmlPath, titleMap, config);
    if (!script) {
        console.log(`Нет родителей для крошек: ${htmlPath}`);
        return;
    }

    let content = fs.readFileSync(htmlPath, 'utf8');
    const bodyCloseIndex = content.lastIndexOf('</body>');
    if (bodyCloseIndex === -1) {
        console.log(`Не найден </body> в: ${htmlPath}`);
        return;
    }
    const newContent = content.slice(0, bodyCloseIndex) + '\n<script>\n' + script + '\n</script>\n' + content.slice(bodyCloseIndex);
    fs.writeFileSync(htmlPath, newContent, 'utf8');
    console.log(`Вставлен скрипт: ${htmlPath}`);
}

function main() {
    const buildDir = path.resolve(CONFIG.buildDir);
    if (!fs.existsSync(buildDir)) {
        console.error(`Папка сборки не найдена: ${buildDir}`);
        process.exit(1);
    }
    CONFIG.buildDir = buildDir;

    console.log(`Конфигурация: buildDir=${buildDir}, separator="${CONFIG.separator}"`);
    const titleMap = buildTitleMap(buildDir);
    console.log('Вставка скриптов хлебных крошек...');
    walkHtmlFiles(buildDir, (htmlPath) => {
        injectScriptIntoFile(htmlPath, titleMap, CONFIG);
    });
    console.log('Готово!');
}

if (require.main === module) {
    main();
}