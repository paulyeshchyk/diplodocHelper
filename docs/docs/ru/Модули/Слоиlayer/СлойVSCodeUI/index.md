---
title: Слой. VS Code UI
sectionType: Page
context: 'layer, vscode-ui'
pureTitle: Слой. VS Code UI
---


|               |                                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| Идентификатор | `vscode-ui`                                                                            |
| designation   | Точка входа из интерфейса VS Code                                                      |
| Время работы  | При редактировании (runtime VS Code)                                                   |
| Состав        | `src/extension.js`, `src/commands/*`, `src/ContextMenuManager.js`, `src/nls_loader.js` |

{: .page-legend }

## Назначение

Слой `vscode-ui` — всё, что пользователь вызывает **изнутри VS Code**: команды палитры, контекстные меню Explorer и редактора, code-actions, промпты и диалоги. Логики в этом слое нет: он принимает `vscode.Uri` и состояние редактора, а работу делегирует модулям из `pre-processing` (правка `.md`) или `post-processing` (правка `.html`).

## Когда включается

- **При старте VS Code** — `activate()` в `src/extension.js` (activationEvent `onStartupFinished`).
- **По контекстному меню** — все подменю `diplodoc-helper.*` из `package.json → contributes.menus`.
- **По палитре команд** — тот же список команд.

## Состав

{% cut "Развернуть" %}

{% include [VS Code ui](./modules.md) %}

{% endcut %}
