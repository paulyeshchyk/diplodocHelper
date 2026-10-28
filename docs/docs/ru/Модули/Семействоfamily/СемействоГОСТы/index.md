---
title: Семейство. ГОСТы
sectionType: Page
pureTitle: Семейство. ГОСТы
sectionIndex: ""
---


### 4. ГОСТы (`gost`) {#fam-gost}

Третье зеркало — ГОСТы. Отличие: `gosts.client` рисует **таблицу с карточками**, а не тултипы. `abbrs`/`terms` — про inline-разметку, `gosts` — про отдельную страницу.

```mermaid
flowchart LR
  g["gosts<br/>(pre + post)"]
  gc["gosts.client<br/>(client-runtime)"]
  g <-->|"пара"| gc
```
### Модули

{% include [модули](modules.md) %}

