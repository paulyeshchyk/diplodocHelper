// @ts-nocheck
// plugins/contexts/contexts.js

const path = require('path');
const fs = require('fs');

const { walkMdFilesGetContexts } = require('./сontexts.collector');
const {
    writeTermFiles,
    writeIndexMd,
    writeTocAndIndexYaml,
    writeContextSearchScript,
    writeTailFile,
    writeTocAndIndexYamlComplete,
} = require('./contexts.writer');
const { resolveMetric } = require('./modules/metrics');

/** @import {ContextMap} from '../model/contextmap.model' */
/** @import {PluginExecutionResult} from '../model/plugin.model' */

const TAIL_PIVOT_RANK = 3; // термы с rank < 3 уходят в tail
const TAIL_FILE_SLUG = { ru: 'prochee', en: 'other' };
const TAIL_LABEL = { ru: 'Прочее', en: 'Other' };

/**
 * Разделяет термы на «основные» (rank >= pivot) и «хвост».
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 * @param {{ sizeMetric?: string|object, colorMetric?: string|object }} [opts]
 * @returns {{ terms: string[], tailMeta: object|null }}
 */
function collapseTail(sortedTerms, contextMap, lang, opts = {}) {
    const pivot = TAIL_PIVOT_RANK;
    const sizeSpec = resolveMetric(opts.sizeMetric || 'rank');
    const colorSpec = resolveMetric(opts.colorMetric || 'rank');

    const head = [];
    const tail = [];
    for (const term of sortedTerms) {
        const rank = contextMap[term]?.rank || 0;
        (rank >= pivot ? head : tail).push(term);
    }
    if (tail.length === 0) return { terms: head, tailMeta: null };

    const safeNum = v => (Number.isFinite(v) ? v : 0);

    const maxHeadSize = head.length ? Math.max(...head.map(t => safeNum(sizeSpec.valueOf(contextMap[t])))) : 10;
    const sizeDisplay = Math.max(1, Math.round(maxHeadSize * 0.4));

    const colorDisplay = tail.reduce((s, t) => s + safeNum(colorSpec.valueOf(contextMap[t])), 0);

    const fileSlug = TAIL_FILE_SLUG[lang] || 'other';
    const label = TAIL_LABEL[lang] || 'Other';
    const countText = lang === 'ru' ? `${tail.length} терм.` : `${tail.length} terms`;

    return {
        terms: head,
        tailMeta: {
            key: '__tail__',
            label,
            countText,
            count: tail.length,
            fileSlug,
            href: `${lang}/contexts/${fileSlug}.html`,
            sizeDisplay,
            colorDisplay,
            sizeMetric: sizeSpec,
            colorMetric: colorSpec,
            children: tail,
            pivot,
        },
    };
}

/**
 * @param {string} lang
 * @param {string} langDir
 * @param {ContextMap} contextMap
 * @returns {boolean}
 */
function generateFilesForLang(lang, langDir, contextMap) {
    try {
        if (Object.keys(contextMap).length === 0) return false;

        const outputDir = path.join(langDir, 'contexts');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const sortedTerms = Object.keys(contextMap).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        // отсекаем хвост
        const { terms: displayTerms, tailMeta } = collapseTail(sortedTerms, contextMap, lang, {
            sizeMetric: 'totalSize',
            colorMetric: 'rank',
        });

        const title = lang === 'ru' ? 'Контексты' : 'Contexts';

        // Терм-файлы — только по крупным (tail пишется отдельно)
        writeTermFiles(outputDir, sortedTerms, contextMap, langDir);

        // index.md с картой — теперь с tailMeta
        writeIndexMd(outputDir, displayTerms, contextMap, lang, title, tailMeta);

        // toc / index.yaml — без tail (он доступен по клику с карты)
        writeTocAndIndexYamlComplete(outputDir, sortedTerms, contextMap, lang, tailMeta);

        // страница хвоста
        writeTailFile(outputDir, tailMeta, contextMap, lang);

        return true;
    } catch (err) {
        console.error(`❌ Error generating files for ${lang}:`, err);
        return false;
    }
}

function buildAllContexts(docsRoot) {
    const LANGUAGES = ['ru', 'en'];
    const results = { success: [], failed: [] };
    const contextMaps = {};

    for (const lang of LANGUAGES) {
        const langDir = path.join(docsRoot, lang);
        if (fs.existsSync(langDir)) {
            const contextMap = walkMdFilesGetContexts(langDir);
            contextMaps[lang] = contextMap;
            if (generateFilesForLang(lang, langDir, contextMap)) {
                results.success.push(lang);
            } else {
                results.failed.push(lang);
            }
        }
    }

    // Генерируем общий скрипт поиска (если есть хотя бы один язык)
    if (contextMaps.ru || contextMaps.en) {
        writeContextSearchScript(docsRoot, contextMaps.ru || {}, contextMaps.en || {});
    }

    return results;
}

/**
 * @param {string} docsRoot
 * @returns {PluginExecutionResult}
 */
function runGeneration(docsRoot) {
    return buildAllContexts(docsRoot);
}

module.exports = { runGeneration };
