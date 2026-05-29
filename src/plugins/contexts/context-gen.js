const fs = require('fs');
const path = require('path');

const DOCS_ROOT = './docs';
const LANGUAGES = ['ru', 'en']; // Список поддерживаемых языков

/**
 * Основная функция запуска
 */
function main() {
    LANGUAGES.forEach(lang => {
        const langDir = path.join(DOCS_ROOT, lang);

        if (fs.existsSync(langDir)) {
            console.log(`--- Обработка языка: ${lang} ---`);
            const contextMap = collectContextsForLang(langDir);
            generateFilesForLang(lang, langDir, contextMap);
        }
    });
    console.log('Все контексты успешно обновлены!');
}

/**
 * Собирает контексты для конкретной языковой папки
 */
function collectContextsForLang(langDir) {
    const contextMap = {};

    function walk(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                // Пропускаем папку contexts, чтобы не зациклиться
                if (file !== 'contexts') walk(fullPath);
            } else if (file.endsWith('.md')) {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Извлекаем контекст и заголовок
                const contextMatch = content.match(/^---[\s\S]*?context:\s*(.*)[\s\S]*?---/);
                if (contextMatch && contextMatch[1]) {
                    const terms = contextMatch[1].split(',').map(t => t.trim().toLowerCase());
                    const titleMatch = content.match(/^#\s+(.*)/m);
                    const title = titleMatch ? titleMatch[1] : path.basename(fullPath);

                    // Путь относительно языковой папки (например, "folder/file.md")
                    const relativeToLang = path.relative(langDir, fullPath).replace(/\\/g, '/');

                    terms.forEach(term => {
                        if (!contextMap[term]) contextMap[term] = { rank: 0, pages: [] };
                        contextMap[term].rank += 1;
                        contextMap[term].pages.push({ title, href: relativeToLang });
                    });
                }
            }
        });
    }

    walk(langDir);
    return contextMap;
}

/**
 * Создает md-файлы и index.yaml внутри docs/{lang}/contexts/
 */
function generateFilesForLang(lang, langDir, contextMap) {
    const outputDir = path.join(langDir, 'contexts');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const sortedTerms = Object.keys(contextMap).sort((a, b) => contextMap[b].rank - contextMap[a].rank);

    // 1. Создаем индивидуальные .md файлы для каждого контекста
    sortedTerms.forEach(term => {
        let mdContent = `# ${term.toUpperCase()}\n\n`;
        contextMap[term].pages.forEach(p => {
            // Путь строится так: ../ (выход из папки contexts) + путь от корня языка
            mdContent += `* [${p.title}](../${p.href})\n`;
        });
        fs.writeFileSync(path.join(outputDir, `${term}.md`), mdContent);
    });

    // 2. Создаем index.md (Landing Page) для этого языка
    let mdLandingContent = `---\ntitle: Контексты (${lang.toUpperCase()})\n---\n\n`;
    mdLandingContent += `# Облако тем\n\n`;
    mdLandingContent += `{% block cards %}\n\n`; // Используем стандартный блок карточек

    sortedTerms.forEach(term => {
        // В Diplodoc href в карточках внутри md лучше писать без .html, 
        // он сам подставит нужное при сборке
        mdLandingContent += `{% item card title="${term}" description="Статей: ${contextMap[term].rank}" href="${term}.md" %}\n`;
    });

    mdLandingContent += `\n{% endblock %}\n`;

    fs.writeFileSync(path.join(outputDir, 'index.md'), mdLandingContent);

    // 2. Создаем index.yaml (Landing Page) для этого языка
    let yamlContent = `title: Контексты (${lang.toUpperCase()})\nlinks:\n`;

    sortedTerms.forEach(term => {
        yamlContent += `  - title: "${term}"\n`;
        yamlContent += `    description: "Статей: ${contextMap[term].rank}"\n`;
        yamlContent += `    href: "${term}.html"\n`;
    });

    fs.writeFileSync(path.join(outputDir, 'index.yaml'), yamlContent);
    console.log(`[${lang}] Создано контекстов: ${sortedTerms.length}`);
}

main();