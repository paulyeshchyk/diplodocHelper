---
title: Семейство. Термины
sectionType: Page
pureTitle: Семейство. Термины
sectionIndex: ""
---


### 3. Термины (`term`) {#fam-term}

Точное зеркало `abbr`: та же структура, другой словарь (`terms.yaml` вместо `abbreviations.yaml`). `<abbr class="term">` — маркер, по которому модули отличают «свой» тег.

```mermaid
flowchart LR
  t["terms<br/>(pre + post)"]
  tc["terms.client<br/>(client-runtime)"]
  t <-->|"пара"| tc
```

### Модули

{% include [модули](modules.md) %}

