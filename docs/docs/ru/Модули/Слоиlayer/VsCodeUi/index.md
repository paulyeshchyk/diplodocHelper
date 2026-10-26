---
title: VS Code UI
sectionType: Page
context: layer, vscode-ui
---

|               |                                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| Идентификатор | `vscode-ui`                                                                            |
| Назначение    | Точка входа из интерфейса VS Code                                                      |
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

- `src/extension.js` — `activate()` / `deactivate()`, регистрация команд, провайдеров code-actions и хайлайтеров.
- `src/commands/*` — по файлу на команду или группу: `diplodoc-helper.section.Create.js`, `diplodoc-helper.link.Copy.js`, `diplodoc-helper.gost.Insert.js` и т.д.
- `src/ContextMenuManager.js` — менеджер контекстных ключей (`setContext`) с debounce и опциональным polling.
- `src/nls_loader.js` — загрузчик локализации (`package.nls.<locale>.json`).
- `src/plugins/manifest/` — декларативный генератор `contributes`, пишет `package.json` при сборке.