import type { Inspection } from '../init-config.types.ts';

/**
 * `_registry/dimensions.yaml` — skeleton.
 *
 * Wave 4: только минимальный набор (`content_type`, `status`) с готовыми
 * значениями, если они стандартны. Остальные (module, section, audience) —
 * пустые items (пользователь заполнит).
 */
export function scaffoldDimensions(inspection: Inspection): string {
  const lines: string[] = [];
  lines.push('# Справочник измерений. Заполните items для каждого измерения.');
  lines.push('# Подробности: FEATURE-MAP.md §2.3.');
  lines.push('');
  lines.push('dimensions:');

  lines.push('  content_type:');
  lines.push('    title: Тип контента');
  lines.push('    items:');
  lines.push('      screen:   { title: "Скрин" }');
  lines.push('      flow:     { title: "Переход" }');
  lines.push('      glossary: { title: "Определение" }');
  lines.push('      standard: { title: "Стандарт" }');
  lines.push('      overview: { title: "Обзор" }');
  lines.push('');

  lines.push('  status:');
  lines.push('    title: Статус');
  lines.push('    items:');
  lines.push('      draft:    { title: "Черновик" }');
  lines.push('      review:   { title: "На ревью" }');
  lines.push('      done:     { title: "Готово" }');
  lines.push('      outdated: { title: "Устарело" }');

  return lines.join('\n') + '\n';
}