---
title: Семейство. Дорожная карта
sectionType: Page
pureTitle: Семейство. Дорожная карта
sectionIndex: ""
---


### 6. Дорожная карта (`roadmap` / `gantt`) {#fam-roadmap}

Пара «генератор → патчер». `roadmap` генерирует `roadmap/index.md` с диаграммой Ганта, `roadmap.patcher` встраивает клиентский скрипт для pan/zoom. Без патчера диаграмма статична (видна, но не интерактивна).

```mermaid
flowchart LR
  r["roadmap<br/>(pre-processing)"]
  rp["roadmap.patcher<br/>(post + client)"]
  r <-->|"пара"| rp
```
### Модули

{% include [модули](modules.md) %}

