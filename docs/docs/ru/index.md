# Diplodoc helper — документация

Единая точка входа в документацию проекта. Если не знаешь, с чего начать — читай раздел «Куда идти».

---

## Куда идти

| Если ты…                                      | Начни с                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Впервые в проекте                             | [`00. Meta/onboarding.md`](./00.%20Meta/onboarding.md)                           |
| Нужны повседневные команды (serve, test, gen) | [`00. Meta/readme.for.dummies.md`](./00.%20Meta/readme.for.dummies.md)           |
| Хочешь понять, что сейчас в работе            | [`00. Meta/sprints/README.md`](./00.%20Meta/sprints/README.md) *(планируется)*   |
| Ищешь, зачем существует та или иная фича      | [`00. Meta/goals/README.md`](./00.%20Meta/goals/README.md)                       |
| Работаешь с бэкендом                          | [`90. Reference/api/README.md`](./90.%20Reference/api/README.md) *(планируется)* |
| Меняешь структуру docs или тестовые ID        | [`00. Meta/conventions/`](./00.%20Meta/conventions/) *(планируется)*             |
| Ищешь конкретный тест-кейс                    | [`testcases.map.md`](./testcases.map.md) *(планируется)*                         |

Правила для AI-ассистента — [`.gemini/GEMINI.md`](../.gemini/GEMINI.md).

---

## Структура

```text
docs/
├── README.md                       
├── 00. Meta/                       # процессы, цели, спринты, конвенции
├── 01. Intro/                      # вводные материалы, итерации 1–2
├── 02. Naming/                     # нейминг продукта и модулей
├── 03. Ico/                        # исходники иконок (переезжает в public/)
├── 90. Reference/                  # контракты, ADR, спецификации
├── diagrams/                       # исходники диаграмм (планируется)
└── testcases.map.md                # карта Test IDs (планируется)
```

### 00. Meta

Процессы и планирование.

- `onboarding.md` — архитектурный гид проекта: паттерны, слои, правила импортов.
- `readme.for.dummies.md` — шпаргалка по CLI, тестам, генерации, PrimeNG.
- `goals/` — цели (пользовательские сценарии) с диаграммами.
- `sprints/` — план работ, сгруппированный по целям (планируется).
- `conventions/` — соглашения о структуре docs, Test IDs, keyboard-first (планируется).

### 01. Intro

Вводные материалы для новых участников. Две итерации:

- **Итерация 1** — каркас Angular-приложения, авторизация через interceptor, server-driven UI.
- **Итерация 2** — настройка окружения, структура папок, детализация core и UI.

Исходники диаграмм — PlantUML. Планируется переезд в `docs/diagrams/source/puml/01-intro/` и добавление рендеренных SVG.

### 02. Naming

Рабочие материалы по неймингу продукта. Не являются частью архитектуры — справочный архив.

### 03. Ico

Исходники иконок и favicon.

**TODO:** перенести в `public/favicon/` (favicon-набор) и `src/assets/design/` (логотип). В docs оставить только ссылку и design-reference.

### 90. Reference

Спецификации, контракты и ADR.

- `api/` — точка входа в спецификацию API (планируется).
  - `backend-contract.md` — реальные эндпоинты.
  - `enums.md` — C# enum → строка → домен.
  - `mappers.md` — DTO → домен.
  - `auth.md` — auth-flow (proactive refresh).
  - `permissions.md` — контракт прав.
  - `sequences.md` — сценарии.
- `adr/` — Architecture Decision Records (планируется).

---

## Ключевые документы

### Правила проекта

- [`.gemini/GEMINI.md`](../.gemini/GEMINI.md) — TypeScript / Angular / accessibility / Test IDs / backend-integration.
- `docs/00. Meta/onboarding.md` — архитектурные правила и слои.

### Цели и спринты

- [`00. Meta/goals/README.md`](./00.%20Meta/goals/README.md) — индекс целей.
- [`00. Meta/sprints/sprint.plan.txt.md`](./00.%20Meta/sprints/sprint.plan.txt.md) — текущий план спринтов (монолит; будет разбит на файлы).

### ADR (обязательны к прочтению перед бэкенд-работой)

См. `90. Reference/adr/` *(планируется)*. Пока ключевые решения описаны в `.gemini/GEMINI.md`, раздел «Backend integration».

---

## Правила ведения docs

1. **Один файл — одна сущность.** Цель = файл, спринт = файл, ADR = файл.
2. **Front matter обязателен** для целей и спринтов (см. шаблоны в `00. Meta/goals/_template.md` и `00. Meta/sprints/_template.md` — планируются).
3. **Диаграммы — Mermaid по умолчанию.** PlantUML — только для унаследованных файлов. Новые диаграммы — Mermaid inline в документе.
4. **Test IDs ведутся в карте.** Реестр — `docs/testcases.map.md`. Формат ID — `<node>#<NN>` (см. `.gemini/GEMINI.md`).
5. **Имена файлов — slug.** Без пробелов и кириллицы в имени (кроме номерных префиксов разделов вида `00. Meta/`).
6. **Ссылки — относительные.** Абсолютные пути в репозиторий не пишем.

---

## Changelog

- **2026-09-30** — создан этот индекс. Дальше: шаблоны goals/sprints, разбивка `sprint.plan.txt.md`, вынос диаграмм, карта Test IDs.
