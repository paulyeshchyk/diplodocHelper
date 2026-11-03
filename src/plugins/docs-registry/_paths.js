'use strict';
const path = require('path');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');     // docs/
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');              // docs/docs/
const REGISTRY_DIR = path.join(DOCS_DIR, '_registry');         // docs/docs/_registry/
const GENERATED_DIR = path.join(DOCS_DIR, '_generated');       // docs/docs/_generated/
const ASSETS_DIR   = path.join(DOCS_DIR, '_assets');           // docs/docs/_assets/

module.exports = { SCRIPT_DIR, PROJECT_ROOT, DOCS_DIR, REGISTRY_DIR, GENERATED_DIR, ASSETS_DIR };