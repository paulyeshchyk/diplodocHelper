---
title: Семейство. Ссылки
sectionType: Page
pureTitle: Семейство. Ссылки
sectionIndex: ""
---

### 1. Ссылки (`link`) {#fam-link}

Пара «скопировать → вставить». `link.Copy` кладёт JSON в буфер, `link.Paste` читает и вставляет с корректным путём. **По отдельности бессмысленны** — JSON в буфере некому прочитать.

```mermaid
flowchart LR
  lc["link.Copy<br/>(JSON в буфер)"]
  lp["link.Paste<br/>(относительный путь)"]
  la["link.addAnchor<br/>(стабильный якорь)"]
  lc <-->|"пара"| lp
  la -.->|"якорь, который<br/>может выбрать Paste"| lp
```

`link.addAnchor` — «свободный участник» семьи: создаёт якорь, который `link.Paste` потом предлагает в QuickPick. Но `addAnchor` полезен и сам по себе (если пользователь делает ссылку вручную).

### Модули

{% include [модули](modules.md) %}


