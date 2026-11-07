import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { DOCS_DIR } from './_paths.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Источник значения поля в `CatalogModule`.
 *
 * - `frontmatter` (default) — из `fm[frontmatterKey || key]`;
 * - `path` — из `mod.dir` по правилам в `f.path` (техпис НЕ вводит);
 * - `frontmatter-or-path` — сначала frontmatter; если пусто — path.
 */
export type FieldSource = 'frontmatter' | 'path' | 'frontmatter-or-path';

export interface PathRule {
    /** JS-regex (строка), применяется к `mod.dir` (posix, relative от `docsRoot`). */
    regex: string;
    /** Slug, добавляемый в `mod[dimField]` при match. */
    slug: string;
}

export interface PathConfig {
    /** `regex + template`: `{ regex: "Раздел(\\d+)", template: "s$1" }`. */
    regex?: string;
    template?: string;
    /** Или список правил (словарь): `[{ regex, slug }, …]`. */
    rules?: PathRule[];
}

export interface FieldDef {
    kind?: 'multi' | 'scalar';
    dimension?: string;
    dimField?: string;
    frontmatterKey?: string;
    format?: 'plain' | 'backtick' | 'double';
    label?: string;
    useAs?: string;
    order?: number;
    source?: FieldSource;
    path?: PathConfig;
    [key: string]: unknown;
}

export interface FieldsManifest {
    [key: string]: FieldDef;
}

/**
 * Дефолтный путь к манифесту полей. Используется, если `loadFields()`
 * вызван без явного пути.
 *
 * При передаче `fieldsPath` (напр. из `runCollectCatalog` с нестандартным
 * `docsDir`) — читается именно он. Это позволяет тестам и второму проекту
 * не полагаться на `DOCS_DIR`, который кешируется в `_paths.ts`.
 */
export const FIELDS_PATH: string = path.join(DOCS_DIR, '_registry', 'fields.yaml');

/**
 * Кеш по абсолютному пути к манифесту. Не по `DOCS_DIR` — потому что
 * `loadFields(fieldsPath)` может вызываться для разных проектов в одном
 * процессе (тесты, второй проект).
 */
const CACHE = new Map<string, FieldsManifest>();

/**
 * Загружает манифест полей. Кеширует по `fieldsPath`.
 *
 * @param fieldsPath — абсолютный путь к `fields.yaml`. Если не задан —
 *                     `FIELDS_PATH` (т.е. `<DOCS_DIR>/_registry/fields.yaml`).
 * @returns `{}` при отсутствии файла или ошибке парсинга (с предупреждением в stderr).
 */
export function loadFields(fieldsPath?: string): FieldsManifest {
    const p = fieldsPath ?? FIELDS_PATH;
    if (CACHE.has(p)) return CACHE.get(p)!;

    if (!fs.existsSync(p)) {
        console.warn(`[fields] ${p} не найден — пустой манифест`);
        CACHE.set(p, {});
        return {};
    }

    try {
        const raw = yaml.load(fs.readFileSync(p, 'utf8')) as
            | { fields?: FieldsManifest }
            | null
            | undefined;
        if (!raw || typeof raw !== 'object' || !raw.fields) {
            throw new Error('ожидался { fields: { <key>: {...} } }');
        }
        CACHE.set(p, raw.fields);
        return raw.fields;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[fields] ошибка чтения ${p}: ${msg}`);
        CACHE.set(p, {});
        return {};
    }
}

export function sortedFieldKeys(fieldsPath?: string): string[] {
    return Object.entries(loadFields(fieldsPath))
        .sort((a, b) => (a[1].order ?? 9999) - (b[1].order ?? 9999))
        .map(([k]) => k);
}

export function pick(prop: string, fieldsPath?: string): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(loadFields(fieldsPath))) {
        const value = v[prop];
        if (value !== undefined) out[k] = value;
    }
    return out;
}

export function fieldsByRole(role: string, fieldsPath?: string): Array<[string, FieldDef]> {
    return Object.entries(loadFields(fieldsPath))
        .filter(([, v]) => v.useAs === role)
        .sort((a, b) => (a[1].order ?? 9999) - (b[1].order ?? 9999));
}