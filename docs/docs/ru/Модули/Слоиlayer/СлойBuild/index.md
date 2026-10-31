---
title: Слой. Build
sectionType: Page
pureTitle: Слой. Build
sectionIndex: ""
---

### `build` {#build}

**Когда:** между `pre-processing` и `post-processing`. Один раз за сборку.

**Что:** превращает `docs/` в `build/`. Собственного кода почти нет — вызывает `@diplodoc/cli` (внешний пакет).

**Характерные черты:** сюда нельзя «добавить модуль» — это внешний процесс. Но **порядок** в `docs-build` (`--apply-presets internal`, `--allow-custom-resources`) — тоже часть слоя.

**Модули**:

{% cut "Развернуть" %}

{% include [Build](./modules.md) %}

{% endcut %}

