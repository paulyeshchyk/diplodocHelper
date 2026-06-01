// src/plugins/contexts/generateContexts.writer.js

const fs = require('fs');
const path = require('path');

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
 */
function writeTermFiles(outputDir, sortedTerms, contextMap) {
    for (const term of sortedTerms) {
        const slug = slugify_filename(term);
        let content = `# ${term.toUpperCase()}\n\n`;
        contextMap[term]?.pages.forEach(p => {
            content += `* [${p.title}](../${p.href})\n`;
        });
        fs.writeFileSync(path.join(outputDir, `${slug}.md`), content, 'utf8');
    }
}

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 * @param {string} title
 */
function writeIndexMd(outputDir, sortedTerms, contextMap, lang, title) {
    const suffix = lang === 'ru' ? 'ст.' : 'docs';
    let content = INDEX_MD_DEFAULT_CONTENT(title);
    let currentLetter = '';

    for (const term of sortedTerms) {
        const firstLetter = term.charAt(0).toUpperCase();
        const slug = slugify_filename(term);
        const count = contextMap[term]?.rank || 0;

        if (firstLetter !== currentLetter) {
            if (currentLetter !== '') content += '\n';
            content += `\n## ${firstLetter}\n`;
            currentLetter = firstLetter;
        }
        content += `* [${term}](${slug}.md) (${count} ${suffix})\n`;
    }

    fs.writeFileSync(path.join(outputDir, 'index.md'), content.trim() + '\n', 'utf8');
}

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 */
function writeTocAndIndexYaml(outputDir, sortedTerms, contextMap, lang) {
    const title = lang === 'ru' ? 'Контексты' : 'Contexts';
    const slugifiedItems = sortedTerms.map(t => ({
        term: t,
        slug: slugify_filename(t),
    }));

    const tocItems = slugifiedItems.map(i => TOC_YAML_LINK_TEMPLATE(i)).join('\n');

    fs.writeFileSync(path.join(outputDir, 'toc.yaml'), TOC_YAML_LINKS_TEMPLATE(title, tocItems), 'utf8');

    const linksYaml = slugifiedItems.map(i => INDEX_YAML_LINK_TEMPLATE(i, contextMap)).join('\n');

    fs.writeFileSync(path.join(outputDir, 'index.yaml'), INDEX_TAML_LINKS_TEMPLATE(title, linksYaml), 'utf8');
}

module.exports = {
    writeTermFiles,
    writeIndexMd,
    writeTocAndIndexYaml,
};
