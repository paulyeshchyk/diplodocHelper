// @ts-nocheck
// contexts/generateContexts.writer.js

const fs = require('fs');
const path = require('path');
const { parse } = require('../utils/frontmatter.utils');

const { generateMapContent, generateRankingContent } = require('./modules/map');
const { generateListContent } = require('./modules/list');
const { generateSearchContent } = require('./modules/search');
const { generateTabsMarkup } = require('./modules/tabs');

const {
    INDEX_MD_DEFAULT_CONTENT,
    TOC_YAML_LINKS_TEMPLATE,
    TOC_YAML_LINK_TEMPLATE,
    INDEX_TAML_LINKS_TEMPLATE,
    INDEX_YAML_LINK_TEMPLATE,
} = require('./contexts.template');

const { slugify_filename } = require('../utils/encoding.slugify');

/** @import {ContextMap} from '../model/contextmap.model' */

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} langDir — абсолютный путь к docs/<lang>
 */
function writeTermFiles(outputDir, sortedTerms, contextMap, langDir) {
    for (const term of sortedTerms) {
        const slug = slugify_filename(term);
        const pages = contextMap[term]?.pages || [];
        if (pages.length === 0) continue;

        const tree = buildTree(pages, langDir);
        const listContent = renderTree(tree, 0);

        const content = `# ${term.toUpperCase()}\n\n${listContent}`;
        fs.writeFileSync(path.join(outputDir, `${slug}.md`), content, 'utf8');
    }
}

/**
 * Строит дерево путей из массива страниц.
 * @param {Array<{title: string, href: string}>} pages
 * @param {string} langDir — абсолютный путь к docs/<lang>
 */
function buildTree(pages, langDir) {
    const root = { name: 'root', children: [], isPage: false, isRoot: true };

    function findOrCreateNode(parent, segments, create = true, parentPath = '') {
        if (segments.length === 0) return parent;
        const [first, ...rest] = segments;
        const fullPath = parentPath ? `${parentPath}/${first}` : first;

        let child = parent.children.find(c => c.name === first);

        if (!child && create) {
            child = {
                name: first,
                // ← ГЛАВНОЕ: title из index.md, если он есть
                title: resolveFolderTitle(langDir, fullPath),
                children: [],
                isPage: false,
            };
            parent.children.push(child);
        }
        if (!child) return null;
        if (rest.length === 0) return child;
        return findOrCreateNode(child, rest, create, fullPath);
    }

    const sortedPages = [...pages].sort((a, b) => a.href.length - b.href.length);

    for (const page of sortedPages) {
        const segments = page.href.split('/').filter(s => s.length > 0);
        const fileName = segments[segments.length - 1];
        const isIndex = fileName === 'index.md';

        if (isIndex) {
            // index.md → страница папки
            const folderSegments = segments.slice(0, -1);
            const folderNode = findOrCreateNode(root, folderSegments, true);
            folderNode.isPage = true;
            folderNode.href = page.href;
            // Если title уже стоит из resolveFolderTitle — не перезатираем его
            // фолбэком на page.title (который может быть неполным).
            folderNode.title = folderNode.title || page.title;
            folderNode.size = page.size;
        } else {
            // обычный .md файл
            const parentSegments = segments.slice(0, -1);
            const parentNode = findOrCreateNode(root, parentSegments, true);
            const leafName = fileName.replace(/\.md$/, '');
            let leaf = parentNode.children.find(c => c.name === leafName);
            if (!leaf) {
                leaf = {
                    name: leafName,
                    title: page.title,
                    children: [],
                    isPage: true,
                    href: page.href,
                    size: page.size,
                };
                parentNode.children.push(leaf);
            } else {
                leaf.isPage = true;
                leaf.href = page.href;
                leaf.title = page.title || leaf.title;
                leaf.size = page.size;
            }
        }
    }

    return root;
}

/**
 * Форматирует размер в читаемый вид (Б, КБ, МБ)
 */
function formatSize(bytes) {
    if (typeof bytes !== 'number' || bytes < 0) return '';
    if (bytes === 0) return ' (0 Б)';
    const units = ['Б', 'КБ', 'МБ'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    let display;
    if (unitIndex === 0) {
        // Байты — целое число
        display = Math.round(value);
    } else {
        // КБ и МБ — один знак после запятой, если меньше 10, иначе целое
        display = value >= 10 ? Math.round(value) : value.toFixed(1);
    }
    return ` (${display} ${units[unitIndex]})`;
}

/**
 * Рекурсивно рендерит дерево в Markdown-список с отступами.
 * @param {Object} node - узел дерева
 * @param {number} depth - уровень вложенности (для отступов)
 * @returns {string} Markdown-список
 */
function renderTree(node, depth) {
    const indent = '  '.repeat(depth);
    let result = '';
    const children = node.children || [];
    if (children.length === 0) return result;

    // Сортировка по отображаемому имени с учётом чисел
    const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
    const sorted = [...children].sort((a, b) => {
        const nameA = a.title || a.name || '';
        const nameB = b.title || b.name || '';
        return collator.compare(nameA, nameB);
    });

    for (const child of sorted) {
        if (child.isPage && child.href) {
            const sizeStr = formatSize(child.size);
            const link = `../${child.href}`;
            result += `${indent}- [${child.title || child.name}](${link})${sizeStr}\n`;
            if (child.children && child.children.length > 0) {
                result += renderTree(child, depth + 1);
            }
        } else {
            // Узел не страница (папка без index.md) - выводим пункт без ссылки
            result += `${indent}- ${child.title || child.name || 'Без названия'}\n`;
            if (child.children && child.children.length > 0) {
                result += renderTree(child, depth + 1);
            }
        }
    }
    return result;
}

function writeIndexMd(outputDir, sortedTerms, contextMap, lang, title, tailMeta = null) {
    const sizeMetric = 'totalSize'; // размер ячейки
    const colorMetric = 'rank'; // цвет заливки
    const metricsLayout = 'inline';

    const mapContent = generateMapContent({
        lang,
        sortedTerms,
        contextMap,
        width: 1100,
        height: 900,
        tailMeta,
        sizeMetric,
        colorMetric,
        metricsLayout,
    });

    const rankingContent = generateRankingContent({
        lang,
        sortedTerms,
        contextMap,
        width: 1100,
        height: 900,
    });

    const listContent = generateListContent({
        lang,
        sortedTerms,
        contextMap,
    });

    const searchContent = generateSearchContent({
        lang,
        placeholder: lang === 'ru' ? 'Введите контексты через пробел...' : 'Enter contexts separated by space...',
    });

    // 2. Собираем табы
    const tabs = [
        { title: lang === 'ru' ? 'Алфавитный указатель' : 'Index', content: listContent },
        { title: lang === 'ru' ? 'Карта' : 'Map', content: mapContent },
        { title: lang === 'ru' ? 'Рейтинг' : 'Ranking', content: rankingContent },
        { title: lang === 'ru' ? 'Поиск' : 'Search', content: searchContent },
    ];

    const tabsMarkup = generateTabsMarkup({ tabs, selectedIndex: 0 });

    // 3. Формируем итоговый контент
    let content = INDEX_MD_DEFAULT_CONTENT(title);
    content += `\n${tabsMarkup}`;

    fs.writeFileSync(path.join(outputDir, 'index.md'), content.trim() + '\n', 'utf8');
}

/**
 * Генерирует JS-скрипт для поиска по контекстам
 * @param {string} docsRoot - корневая папка документации
 */
function writeContextSearchScript(docsRoot) {
    const resolvedDocsRoot = path.resolve(docsRoot);
    const scriptsDir = path.join(resolvedDocsRoot, '_assets', 'scripts');
    if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

    const clientScriptPath = path.join(__dirname, 'context-search.client.js');
    const clientScriptCode = fs.readFileSync(clientScriptPath, 'utf8');
    fs.writeFileSync(path.join(scriptsDir, 'context-search.js'), clientScriptCode, 'utf8');
}

/**
 * Пишет toc.yaml (без подпунктов) и index.yaml (карточки для страницы раздела).
 *
 * toc.yaml намеренно содержит пустой items: раздел «Контексты» должен
 * появляться в общем оглавлении как одна ссылка, без разворачивания
 * отдельных терминов. Сами терм-страницы при этом генерируются
 * и доступны по прямым ссылкам с карты / рейтинга / списка на index.md.
 *
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 * @param {object|null} [tailMeta]
 */
function writeTocAndIndexYaml(outputDir, sortedTerms, contextMap, lang, tailMeta = null) {
    const title = lang === 'ru' ? 'Контексты' : 'Contexts';

    // ─── toc.yaml ────────────────────────────────────────────────
    // items: [] — ничего не подмешивается в общее оглавление.
    const tocContent = [`title: ${title}`, `href: index.md`, `items: []`].join('\n');
    fs.writeFileSync(path.join(outputDir, 'toc.yaml'), tocContent + '\n', 'utf8');

    // ─── index.yaml ──────────────────────────────────────────────
    // Оставляем как было: карточки на странице /contexts/index.md
    const slugifiedItems = sortedTerms.map(t => ({
        term: t,
        slug: slugify_filename(t),
    }));

    const isRu = lang === 'ru';
    const tailLabel = tailMeta ? (isRu ? `Прочее (${tailMeta.count} терм.)` : `Other (${tailMeta.count} terms)`) : null;
    const tailDesc = tailMeta
        ? isRu
            ? `Контексты, встречающиеся реже ${tailMeta.pivot} раз`
            : `Contexts appearing fewer than ${tailMeta.pivot} times`
        : null;

    let linksYaml = slugifiedItems.map(i => INDEX_YAML_LINK_TEMPLATE(i, contextMap)).join('\n');
    if (tailMeta) {
        if (linksYaml.length > 0) linksYaml += '\n';
        linksYaml += `- title: "${tailLabel}"\n  description: "${tailDesc}"\n  href: ${tailMeta.fileSlug}.md`;
    }

    fs.writeFileSync(path.join(outputDir, 'index.yaml'), INDEX_TAML_LINKS_TEMPLATE(title, linksYaml), 'utf8');
}

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 */
function writeTocAndIndexYamlComplete(outputDir, sortedTerms, contextMap, lang, tailMeta = null) {
    const title = lang === 'ru' ? 'Контексты' : 'Contexts';
    const slugifiedItems = sortedTerms.map(t => ({
        term: t,
        slug: slugify_filename(t),
    }));

    const isRu = lang === 'ru';
    const tailLabel = tailMeta ? (isRu ? `Прочее (${tailMeta.count} терм.)` : `Other (${tailMeta.count} terms)`) : null;
    const tailDesc = tailMeta
        ? isRu
            ? `Контексты, встречающиеся реже ${tailMeta.pivot} раз`
            : `Contexts appearing fewer than ${tailMeta.pivot} times`
        : null;

    // --- items ---
    let tocItems = slugifiedItems.map(i => TOC_YAML_LINK_TEMPLATE(i)).join('\n');
    if (tailMeta) {
        if (tocItems.length > 0) tocItems += '\n';
        tocItems += `  - name: "${tailLabel}"\n    href: ${tailMeta.fileSlug}.md`;
    }

    // --- navigation (общий для ru/en, пути абсолютные от корня документации) ---
    const navBlock = [
        `navigation:`,
        `  logo:`,
        `    url: https://ascon.ru/products/gulfstream/`,
        `    dark:`,
        `      icon: _assets/images/Гольфстрим@2x.png`,
        `    light:`,
        `      icon: _assets/images/Гольфстрим@2x.png`,
        `  header:`,
        `    leftItems:`,
        `      - text: "ГОЛЬФСТРИМ: Справка"`,
        `        type: link`,
        `        url: /${lang}/index.html`,
        `    rightItems:`,
        `      - type: controls`,
        `      - type: link`,
        `        icon: _assets/images/mindmap.png`,
        `        url: /${lang}/contexts/index.html`,
        `      - type: link`,
        `        icon: _assets/images/info.png`,
        `        url: /${lang}/ОРуководствепользователя/index.html`,
    ].join('\n');

    // --- toc.yaml ---
    const tocContent = TOC_YAML_LINKS_TEMPLATE(title, tocItems) + '\n' + navBlock + '\n';
    fs.writeFileSync(path.join(outputDir, 'toc.yaml'), tocContent, 'utf8');

    // --- index.yaml ---
    let linksYaml = slugifiedItems.map(i => INDEX_YAML_LINK_TEMPLATE(i, contextMap)).join('\n');
    if (tailMeta) {
        if (linksYaml.length > 0) linksYaml += '\n';
        linksYaml += `- title: "${tailLabel}"\n  description: "${tailDesc}"\n  href: ${tailMeta.fileSlug}.md`;
    }
    fs.writeFileSync(path.join(outputDir, 'index.yaml'), INDEX_TAML_LINKS_TEMPLATE(title, linksYaml), 'utf8');
}

function writeTailFile(outputDir, tailMeta, contextMap, lang) {
    if (!tailMeta) return;

    const isRu = lang === 'ru';
    const title = isRu ? 'Прочее' : 'Other';
    const pivot = tailMeta.pivot;
    const terms = [...tailMeta.children].sort((a, b) =>
        a.localeCompare(b, isRu ? 'ru' : 'en', { sensitivity: 'base' })
    );

    let md = `---\ntitle: ${title}\nsectionType: Page\n---\n\n# ${title}\n\n`;
    if (isRu) {
        md += `Контексты, встречающиеся реже ${pivot} раз (всего ${terms.length}).\n\n`;
    } else {
        md += `Contexts appearing fewer than ${pivot} times (${terms.length} total).\n\n`;
    }

    for (const term of terms) {
        const slug = slugify_filename(term);
        const rank = contextMap[term]?.rank || 0;
        md += `* [${term}](${slug}.md) — ${rank} ${isRu ? 'ст.' : 'art.'}\n`;
    }

    fs.writeFileSync(path.join(outputDir, `${tailMeta.fileSlug}.md`), md, 'utf8');
}

// Кэш: «langDir::путь-папки» → title из index.md (или null)
const folderTitleCache = new Map();

/**
 * Пытается получить title папки из её index.md.
 * @param {string} langDir        — абсолютный путь к docs/<lang>
 * @param {string} folderRelPath  — путь папки относительно langDir, через '/'
 * @returns {string|null}
 */
function resolveFolderTitle(langDir, folderRelPath) {
    const key = `${langDir}::${folderRelPath}`;
    if (folderTitleCache.has(key)) return folderTitleCache.get(key);

    let title = null;
    const indexPath = path.join(langDir, folderRelPath, 'index.md');

    if (fs.existsSync(indexPath)) {
        try {
            const content = fs.readFileSync(indexPath, 'utf8');
            const { data } = parse(content);
            if (data.title && typeof data.title === 'string') {
                title = data.title.trim();
            } else if (data.pureTitle && typeof data.pureTitle === 'string') {
                title = data.pureTitle.trim();
            }
        } catch {
            // не смогли прочитать — остаётся fallback на имя папки
        }
    }

    folderTitleCache.set(key, title);
    return title;
}

module.exports = {
    writeTermFiles,
    writeIndexMd,
    writeTocAndIndexYaml,
    writeTocAndIndexYamlComplete,
    writeContextSearchScript,
    writeTailFile,
};
