// @ts-nocheck
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { DOCS_DIR } = require('./_paths.js');

const FIELDS_PATH = path.join(DOCS_DIR, '_registry', 'fields.yaml');

let cache = null;

function loadFields() {
    if (cache) return cache;

    if (!fs.existsSync(FIELDS_PATH)) {
        console.warn(`[fields] ${FIELDS_PATH} не найден — пустой манифест`);
        cache = {};
        return cache;
    }

    try {
        const raw = yaml.load(fs.readFileSync(FIELDS_PATH, 'utf8'));
        if (!raw || typeof raw !== 'object' || !raw.fields) {
            throw new Error('ожидался { fields: { <key>: {...} } }');
        }
        cache = raw.fields;
        return cache;
    } catch (e) {
        console.error(`[fields] ошибка чтения ${FIELDS_PATH}: ${e.message}`);
        cache = {};
        return cache;
    }
}

function sortedFieldKeys() {
    const f = loadFields();
    return Object.entries(f)
        .sort((a, b) => (a[1].order ?? 9999) - (b[1].order ?? 9999))
        .map(([k]) => k);
}

function pick(prop) {
    const out = {};
    for (const [k, v] of Object.entries(loadFields())) {
        if (v[prop] !== undefined) out[k] = v[prop];
    }
    return out;
}

function fieldsByRole(role) {
    return Object.entries(loadFields())
        .filter(([, v]) => v.useAs === role)
        .sort((a, b) => (a[1].order ?? 9999) - (b[1].order ?? 9999));
}

module.exports = { loadFields, sortedFieldKeys, pick, fieldsByRole, FIELDS_PATH };
