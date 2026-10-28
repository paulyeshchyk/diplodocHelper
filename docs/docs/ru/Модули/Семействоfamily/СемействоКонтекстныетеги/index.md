---
title: Семейство. Контекстные теги
sectionType: Page
pureTitle: Семейство. Контекстные теги
sectionIndex: ""
---


### 5. Контекстные теги (`context-tags`) {#fam-context-tags}

Пара «инжектор → клиент». `context-tags` встраивает `<script>` в каждую статью, `context-tags.client` рисует чипы контекстов. Без клиента — `<script>` есть, чипов нет.

```mermaid
flowchart LR
  ct["context-tags<br/>(post-processing)"]
  ctc["context-tags.client<br/>(client-runtime)"]
  ct <-->|"пара"| ctc
```

### Модули

{% include [модули](modules.md) %}


