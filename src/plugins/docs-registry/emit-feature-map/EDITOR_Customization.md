# Кастомный контент чипа (Chip Content)

Рекомендации по добавлению фичи **«Кастомный контент»** вместо простого `chipLabelField`.

## 1. Текущее состояние

Сейчас в `index.ts`:

```ts
const rawLabel = mod[cfg.chipLabelField];
const scalarLabel = typeof rawLabel === 'string' ? rawLabel.trim() : '';
const pureTitle = typeof mod.pureTitle === 'string' ? mod.pureTitle.trim() : '';
const label = esc(scalarLabel || pureTitle || path.basename(dir));
```

`chipLabelField` — просто имя поля. Этого недостаточно для шаблонов и условной стилизации.

## 2. Предлагаемая модель данных

Заменить скаляр `chipLabelField: string` на объект **ChipContentConfig**.

```ts
/** Конфиг содержимого чипа */
export interface ChipContentConfig {
  /**
   * Шаблон текста.
   * Поддерживает плейсхолдеры: {ident}, {pureTitle}, {dir}, {basename},
   * а также любые scalar-поля модуля: {id}, {designation} и т.д.
   *
   * Примеры:
   *   "{ident}"
   *   "Глава: {ident}"
   *   "{id}. {pureTitle}"
   *   "{basename}"
   */
  template: string;

  /**
   * Fallback-цепочка, если после подстановки шаблон оказался пустым.
   * По умолчанию: ['pureTitle', 'basename']
   */
  fallbacks?: string[];

  /**
   * (Фаза 2) Правила условной стилизации чипа.
   * Пока можно не реализовывать, но заложить структуру.
   */
  styleRules?: ChipStyleRule[];
}

export interface ChipStyleRule {
  /** Условие: "field == value" | "field includes value" | "has dimension:slug" */
  when: string;
  /** CSS-класс или inline-стили, которые нужно добавить чипу */
  className?: string;
  style?: Partial<CSSStyleDeclaration>; // или просто Record<string, string>
}
```

В `FeatureMapConfig`:

```ts
// было
chipLabelField: string;

// стало
chipContent: ChipContentConfig;
```

Для обратной совместимости в `loadFeatureMapConfig`:

```ts
if (typeof raw.chipLabelField === 'string' && !raw.chipContent) {
  knownRaw.chipContent = {
    template: `{${raw.chipLabelField}}`,
    fallbacks: ['pureTitle', 'basename'],
  };
}
```

## 3. Генератор (`index.ts`) — минимальные изменения

Добавить небольшой рендерер шаблона:

```ts
function renderChipLabel(
  mod: CatalogModule,
  dir: string,
  cfg: ChipContentConfig,
): string {
  const vars: Record<string, string> = {
    ident: typeof mod.ident === 'string' ? mod.ident.trim() : '',
    pureTitle: typeof mod.pureTitle === 'string' ? mod.pureTitle.trim() : '',
    dir,
    basename: path.basename(dir),
    id: typeof mod.id === 'string' ? mod.id : '',
    designation: typeof mod.designation === 'string' ? mod.designation : '',
  };

  // любые другие scalar-поля модуля
  for (const [k, v] of Object.entries(mod)) {
    if (typeof v === 'string' && !(k in vars)) {
      vars[k] = v.trim();
    }
  }

  let result = cfg.template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');

  if (!result.trim()) {
    for (const fb of cfg.fallbacks ?? ['pureTitle', 'basename']) {
      if (vars[fb]?.trim()) {
        result = vars[fb];
        break;
      }
    }
  }

  return result.trim() || path.basename(dir);
}
```

В `chipHtml`:

```ts
const label = esc(renderChipLabel(mod, dir, cfg.chipContent));
```

Для **Фазы 2** (цвет/класс по данным) можно сразу начать писать `data-style-attrs` или вычислять класс на этапе генерации, если правило простое.

## 4. Новый экран в редакторе (вместо простого «Chip label field»)

Вкладка **Settings** → секция **Chip Content** (или отдельная подвкладка).

```
┌─ Содержимое чипа ──────────────────────────────────────────┐
│                                                            │
│ Шаблон:                                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Глава: {ident}                                         │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Доступные плейсхолдеры:                                    │
│   {ident}  {pureTitle}  {id}  {basename}  {dir}            │
│   {designation}  + любые scalar-поля модуля                │
│                                                            │
│ Fallback (если шаблон пустой):                             │
│   1. pureTitle                                             │
│   2. basename                                              │
│   [ + добавить ]                                           │
│                                                            │
│ Превью:                                                    │
│   ┌──────────────────┐                                     │
│   │ Глава: alpha     │  ← на примере первого модуля        │
│   └──────────────────┘                                     │
│                                                            │
│ ── Условный стиль (Фаза 2) ─────────────────────────────── │
│ [ ] Включить правила стилизации                            │
│                                                            │
│ Когда:  [ layer includes "cli"          ▼ ]                │
│ Класс:  [ fm-chip--cli                  ]                  │
│ Цвет:   [ #e8f5e9                       ]                  │
│ [ + Правило ]                                              │
└────────────────────────────────────────────────────────────┘
```

## 5. Модернизация скриптов / типов

|#  | Место                        | Что сделать                                                                 |
|---|------------------------------|-----------------------------------------------------------------------------|
| 1 | `feature-map.types.ts`       | Добавить `ChipContentConfig`, `ChipStyleRule`. Пометить `chipLabelField` как `@deprecated`. |
| 2 | `feature-map.constants.ts`   | В `DEFAULT_FEATURE_MAP_CONFIG` заменить на `chipContent: { template: '{ident}', fallbacks: ['pureTitle', 'basename'] }` |
| 3 | `loadFeatureMapConfig`       | Миграция старого `chipLabelField` → `chipContent`                           |
| 4 | `index.ts`                   | Функция `renderChipLabel` + использование в `chipHtml`                      |
| 5 | Тесты `index.test.ts`        | Добавить кейсы: `Глава: {ident}`, пустой шаблон → fallback, отсутствующее поле |
| 6 | Клиент (`feature-map.client.js`) | Пока ничего, если стиль считается на этапе генерации. Позже — поддержка `data-style` / классов |

## 6. Этапы внедрения

### Фаза 1 (примитив — то, что нужно сейчас)

- Ввести `chipContent.template` + `fallbacks`
- Поддержка простых плейсхолдеров `{ident}`, `{pureTitle}`, `{basename}`…
- Обратная совместимость со старым `chipLabelField`
- Обновить Settings-экран в редакторе
- Тесты

### Фаза 2

- `styleRules`
- Условные классы / цвета на основе значений размерностей или полей модуля
- Возможность влиять на цвет чипа «от соседних данных» (через правила)

### Фаза 3 (по желанию)

- Более мощный expression language (если шаблонов станет мало)
- Возможность возвращать HTML-фрагмент вместо plain text (осторожно с XSS)

## 7. Пример итогового конфига

```json
{
  "chipContent": {
    "template": "Глава: {ident}",
    "fallbacks": ["pureTitle", "basename"],
    "styleRules": [
      {
        "when": "layer includes cli",
        "className": "fm-chip--cli",
        "style": { "background": "#e8f5e9" }
      }
    ]
  }
}
```