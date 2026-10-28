---
title: Семейство. Сноски
sectionType: Page
pureTitle: Семейство. Сноски
sectionIndex: ""
---


### 7. Сноски (`footnote`) — цепочка из 5 {#fam-footnote}

Самая длинная семья. Не пара, а **цепочка**: `footnotes` (pre) → `footnoteAnchors` (post) → `footnoteNumbering` (post) → `footnoteList` (post) → `footnoteList.client` (client). Каждый следующий шаг опирается на предыдущий.

```mermaid
flowchart LR
  fn["footnotes<br/>(pre)"]
  fa["footnoteAnchors"]
  fnm["footnoteNumbering"]
  fl["footnoteList"]
  flc["footnoteList.client"]
  fn -->|"нумерация в .md"| fnm
  fa -->|"абсолютные якоря"| fnm
  fnm -->|"сквозные номера"| fl
  fl -->|"данные"| flc
```

**Ключевой момент:** `footnoteNumbering` зависит от **двух** предыдущих (`footnotes` + `footnoteAnchors`). Если `--skip=footnoteAnchors`, `footnoteNumbering` всё равно сработает, но якоря не будут абсолютными.

### Модули

{% include [модули](modules.md) %}


