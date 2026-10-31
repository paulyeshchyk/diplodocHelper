---
title: Модуль. Сервер комментариев
sectionType: Page
pureTitle: Модуль. Сервер комментариев
context: server, api, sqlite, auth, docker
capability: kontent
family: fam-kommentariji
layer:
ID: 052
ID_Group: 6
ID_Type: 2
Идентификатор: 'comments.server'
designation: 'Раздача статики, API для работы с комментариями, БД SQLite, Whitelist-авторизация'
folder: 'server/'
entrypoint: 'node server/server.js'
role:
version: '1.54.0'
---

{% include [legend](./page-legend.md) %}

## Назначение

Сервер заменяет стандартный `http-server` из `Diplodoc`. Он делает две вещи:
1. Раздаёт статические файлы из `build/`.
2. Предоставляет REST API для комментариев.

Это **единственный** источник данных в системе, так как отдельного бэкенда не предусмотрено.

## Безопасность и доступ

Безопасность построена на **Whitelist (Белом списке)**:
- Админ (Техпис) загружает список доверенных email (через `allowed-emails.json` или Админку).
- Читатель вводит Email. Если он есть в списке, система генерирует `claim-code` (6 символов).
- При первом вводе кода создается `session_token` (Bearer token), который браузер сохраняет в `localStorage`.
- Все последующие запросы от читателя идут с этим токеном.
- Защита от спама: rate-limit на создание тредов (60/час на IP).

## Как это работает

```mermaid
flowchart LR
    subgraph browser[Браузер]
        C["comments.client.js"]
        A["comments.admin.js"]
    end
    subgraph server[server.js]
        API["API Router"]
        STATIC["Static Server"]
        AUTH["Auth (HMAC / Bearer)"]
    end
    subgraph db[SQLite]
        T[("threads")]
        CM[("comments")]
        EM[("allowed_emails")]
        SE[("sessions")]
    end
    C -->|POST /api/threads| API
    C -->|GET /api/threads| API
    A -->|PATCH /api/threads| AUTH
    API --> T
    API --> CM
    AUTH --> EM
    AUTH --> SE
```

### Схема БД (SQLite)

- `threads`: корневая сущность (цитата, URL страницы, статус).
- `comments`: реплики внутри треда (автор, текст, тип, ТЗ).
- `allowed_emails`: список email, которым разрешено писать, и их claim-коды.
- `sessions`: активные токены (привязаны к email).

### Docker и инфраструктура

При деплое через Azure Pipeline:
- Используется Volume `gulf-help-data:/app/data` для сохранения БД между перезапусками контейнера.
- Переменная `MODERATOR_TOKEN` передается в контейнер. Если она не задана, сервер генерирует её при первом старте и сохраняет в `data/admin-token.txt`.

## API Endpoints

| Метод   | Путь                | Описание                                                  |
| ------- | ------------------- | --------------------------------------------------------- |
| `GET`   | `/api/threads`      | Получить треды (публичные или все для админа)             |
| `POST`  | `/api/threads`      | Создать комментарий (требует Bearer token или Claim Code) |
| `POST`  | `/api/comments`     | Ответ техписа в тред (требует Auth)                       |
| `PATCH` | `/api/threads/:id`  | Смена статуса (resolve/archive)                           |
| `GET`   | `/api/admin/emails` | Управление Whitelist (только админ)                       |
| `GET`   | `/admin/status`     | Проверка авторизации админа                               |

{% include [legend](./page-legend.md) %}
