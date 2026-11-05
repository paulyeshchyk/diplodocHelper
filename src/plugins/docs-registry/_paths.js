'use strict';
const path = require('path');

const SCRIPT_DIR = __dirname;

/**
 * Корень «проекта документации» — та директория, от которой считаются
 * `docs/`, `_registry/`, `_generated/`.
 *
 * Поведение:
 *   - по умолчанию `path.resolve(SCRIPT_DIR, '..', '..')` — исторический
 *     контракт (работает из `docs/plugins/docs-registry/`, где корень = `docs/`);
 *   - если задан `process.env.DOCS_PROJECT_ROOT` — используется он.
 *     Устанавливается CLI-флагом `--docs-project-root=<path>` **до** первого
 *     `require('./_paths')`, потому что модуль кешируется Node и читает env
 *     однократно.
 *
 * ⚠️ Изменение значения по умолчанию сломает все существующие проекты,
 * установленные через `installScripts`. Флаг — только additive.
 */
const PROJECT_ROOT = process.env.DOCS_PROJECT_ROOT
    ? path.resolve(process.env.DOCS_PROJECT_ROOT)
    : path.resolve(SCRIPT_DIR, '..', '..');

const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const REGISTRY_DIR = path.join(DOCS_DIR, '_registry');
const GENERATED_DIR = path.join(DOCS_DIR, '_generated');
const ASSETS_DIR = path.join(DOCS_DIR, '_assets');

module.exports = { SCRIPT_DIR, PROJECT_ROOT, DOCS_DIR, REGISTRY_DIR, GENERATED_DIR, ASSETS_DIR };