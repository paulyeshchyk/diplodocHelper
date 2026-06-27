// src/plugins/contexts/generateContexts.collector.js

const fs = require('fs');
const path = require('path');
const {
    diplodocFrontmatterExtractContextTagValue,
} = require('../../shared/services/diplodoc.frontmatter.service.context');

/** @import {ContextMap} from '../model/contextmap.model' */

/**
 * Собирает все контексты из директории языка
 * @param {string} langDir
 * @returns {ContextMap}
 */
function walkMdFilesGetContexts(langDir) {
    /** @type {ContextMap} */
    const contextMap = {};

    /**
     * @param {string} dir
     */
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.lstatSync(fullPath);

            if (stat.isDirectory()) {
                if (file !== 'contexts') {
                    walk(fullPath);
                }
            } else if (file.endsWith('.md')) {
                diplodocFrontmatterExtractContextTagValue(fullPath, langDir, contextMap);
            }
        }
    }

    walk(langDir);
    return contextMap;
}

module.exports = { walkMdFilesGetContexts };
