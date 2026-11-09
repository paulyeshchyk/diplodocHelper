```yaml

# Манифест полей MES.
# - service-поля (ident, designation) деривятся из уже существующих;
# - section, audience — извлекаются из пути (техпис НЕ вводит);
# - module, content_type, status — техпис заполняет вручную.

fields:
  # --- Service: идентификация и отображение ---
  ident:
    format: plain
    frontmatterKey: pureTitle     # → "1.1. Создание заказа"
  designation:
    format: plain
    frontmatterKey: title         # → "1.1. Создание заказа" (или "Глава 1. …")

  # --- Dimensions: техпис вводит в frontmatter ---
  module:
    kind: multi
    dimension: module
    dimField: modules
  content_type:
    kind: multi
    dimension: content_type
    dimField: content_types
  status:
    kind: multi
    dimension: status
    dimField: statuses

  # --- Dimensions: path-based (техпис НЕ вводит) ---
  section:
    kind: multi
    dimension: section
    dimField: sections
    source: path
    path:
      regex: "Раздел(\\d+)"
      template: "s$1"
  audience:
    kind: multi
    dimension: audience
    dimField: audiences
    source: path
    path:
      rules:
        - { regex: "АРМ\\s*Менеджера",         slug: "manager" }
        - { regex: "АРМ\\s*Технолога",         slug: "technologist" }
        - { regex: "АРМ\\s*Инженера",          slug: "engineer" }
        - { regex: "АРМ\\s*Планового\\s*отдела", slug: "planner" }
        - { regex: "АРМ\\s*Диспетчера",        slug: "dispatcher" }
        - { regex: "АРМ\\s*Мастера",           slug: "master" }
        - { regex: "АРМ\\s*Рабочего",          slug: "worker" }
        - { regex: "АРМ\\s*Администратора",    slug: "admin" }
```