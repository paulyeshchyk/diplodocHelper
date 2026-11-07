import * as fs from 'node:fs';
import type { LayoutConfig } from './_layout.types.ts';

/**
 * Дефолтный layout = diplodoc-helper до волны C.
 * 100% back-compat: без `layout.json` коллекторы работают как раньше.
 */
export const DEFAULT_LAYOUT: Readonly<LayoutConfig> = Object.freeze({
  modulesFolder: 'Модули',
  modulePrefix: 'Модуль',
  moduleIndexFile: 'index.md',
  moduleSectionTypes: null,
  outFolder: 'Реестр',
  skipDirs: [],
});

/**
 * Загружает `<docsDir>/_registry/layout.json` с мержем поверх `DEFAULT_LAYOUT`.
 *
 * Поведение:
 *   - файла нет → дефолт (полная back-compat);
 *   - файл битый / не объект → `console.warn` + дефолт;
 *   - неизвестные ключи → `console.warn` + игнор (forward-compat);
 *   - отсутствующее отдельное поле → дефолт для этого поля.
 *
 * @param layoutPath — абсолютный или относительный путь к `layout.json`.
 *                     Обычно `<docsDir>/_registry/layout.json`.
 */
export function loadLayout(layoutPath: string): LayoutConfig {
  if (!fs.existsSync(layoutPath)) {
    return { ...DEFAULT_LAYOUT };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[layout] ${layoutPath}: невалидный JSON — ${msg}. Используется дефолт.`);
    return { ...DEFAULT_LAYOUT };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn(`[layout] ${layoutPath}: ожидался объект — используется дефолт.`);
    return { ...DEFAULT_LAYOUT };
  }

  const knownKeys = new Set(Object.keys(DEFAULT_LAYOUT));
  for (const k of Object.keys(raw)) {
    if (!knownKeys.has(k)) {
      console.warn(`[layout] ${layoutPath}: unknown key "${k}" — ignored`);
    }
  }

  const out: LayoutConfig = { ...DEFAULT_LAYOUT };
  const src = raw as Record<string, unknown>;

  if ('modulesFolder' in src) {
    out.modulesFolder = src.modulesFolder === null ? null : String(src.modulesFolder);
  }
  if ('modulePrefix' in src) {
    out.modulePrefix = src.modulePrefix === null ? null : String(src.modulePrefix);
  }
  if ('moduleIndexFile' in src && src.moduleIndexFile != null) {
    out.moduleIndexFile = String(src.moduleIndexFile);
  }
  if ('moduleSectionTypes' in src) {
    out.moduleSectionTypes = Array.isArray(src.moduleSectionTypes)
      ? src.moduleSectionTypes.map(String)
      : null;
  }
  if ('outFolder' in src && src.outFolder != null) {
    out.outFolder = String(src.outFolder);
  }

  return out;
}