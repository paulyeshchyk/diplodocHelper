import type { Inspection } from '../init-config.types.ts';

/**
 * `_registry/fields.yaml` — маппинг frontmatter/пути → поля каталога.
 *
 * Эвристики:
 *   - service: `ident` ← `pureTitle`, `designation` ← `title`;
 *   - `section`: path-based если найден `РазделN`;
 *   - `audience`: path-based если найден `АРМ X`;
 *   - `content_type`, `module`, `status` — frontmatter (техпис заполнит).
 */
export function scaffoldFields(inspection: Inspection): string {
  const lines: string[] = [];
  lines.push('# Манифест полей — какой frontmatter/путь превращается в какое измерение.');
  lines.push('# Подробности: CONTRIBUTING.md §10.3, FEATURE-MAP.md §3.2.');
  lines.push('');
  lines.push('fields:');

  lines.push('  # --- Service: деривится из уже существующих ---');
  lines.push('  ident:');
  lines.push('    format: plain');
  lines.push('    frontmatterKey: pureTitle');
  lines.push('  designation:');
  lines.push('    format: plain');
  lines.push('    frontmatterKey: title');

  lines.push('');
  lines.push('  # --- Dimensions: техпис заполняет в frontmatter ---');
  lines.push('  content_type:');
  lines.push('    kind: multi');
  lines.push('    dimension: content_type');
  lines.push('    dimField: content_types');
  lines.push('  module:');
  lines.push('    kind: multi');
  lines.push('    dimension: module');
  lines.push('    dimField: modules');
  lines.push('  status:');
  lines.push('    kind: multi');
  lines.push('    dimension: status');
  lines.push('    dimField: statuses');

  if (inspection.heuristics.hasRazdelInPath) {
    lines.push('');
    lines.push('  # --- Dimensions: path-based (техпис не вводит) ---');
    lines.push('  section:');
    lines.push('    kind: multi');
    lines.push('    dimension: section');
    lines.push('    dimField: sections');
    lines.push('    source: path');
    lines.push('    path:');
    lines.push('      regex: "Раздел(\\\\d+)"');
    lines.push('      template: "s$1"');
  }

  if (inspection.heuristics.hasArmInPath) {
    if (!inspection.heuristics.hasRazdelInPath) {
      lines.push('');
      lines.push('  # --- Dimensions: path-based (техпис не вводит) ---');
    }
    lines.push('  audience:');
    lines.push('    kind: multi');
    lines.push('    dimension: audience');
    lines.push('    dimField: audiences');
    lines.push('    source: path');
    lines.push('    path:');
    lines.push('      rules:');
    lines.push('        - { regex: "АРМ\\\\s*Менеджера",         slug: "manager" }');
    lines.push('        - { regex: "АРМ\\\\s*Технолога",         slug: "technologist" }');
    lines.push('        - { regex: "АРМ\\\\s*Инженера",          slug: "engineer" }');
    lines.push('        - { regex: "АРМ\\\\s*Планового\\\\s*отдела", slug: "planner" }');
    lines.push('        - { regex: "АРМ\\\\s*Диспетчера",        slug: "dispatcher" }');
    lines.push('        - { regex: "АРМ\\\\s*Мастера",           slug: "master" }');
    lines.push('        - { regex: "АРМ\\\\s*Рабочего",          slug: "worker" }');
    lines.push('        - { regex: "АРМ\\\\s*Администратора",    slug: "admin" }');
  }

  return lines.join('\n') + '\n';
}