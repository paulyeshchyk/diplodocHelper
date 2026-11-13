
# @diplodoc-helper/logger

Единый логгер для пайплайна Diplodoc Helper.

## Установка

    npm install @diplodoc-helper/logger

## Быстрый старт (TypeScript / ESM)

    import { initLogger, getLogger, createLogger } from '@diplodoc-helper/logger';
    initLogger({ level: 'info', file: './logs/app.log', format: 'json' });
    getLogger().log('info', 'bootstrap', 'started');
    const db = createLogger('db');
    db.debug('pool: 10');                          // скрыто при level=info
    db.error('refused', new Error('ECONNREFUSED'));

## Быстрый старт (CommonJS)

    const { initLogger, getLogger } = require('@diplodoc-helper/logger');
    initLogger({ level: 'info' });
    getLogger().log('info', 'bootstrap', 'started');

## Конфигурация

| Источник | Ключ                                                               |
| -------- | ------------------------------------------------------------------ |
| code     | `initLogger({ level, file, format, color, transport })`            |
| env      | `DIPLODOC_LOG_LEVEL` / `DIPLODOC_LOG_FILE` / `DIPLODOC_LOG_FORMAT` |

Уровни: `off` < `error` < `warning` < `info` < `debug`.
Приоритет: `initLogger(...)` > env > defaults.

## Транспорты

- `ConsoleTransport` — stdout (info/debug) / stderr (warn/error), ANSI-цвета при TTY.
- `FileTransport` — append, JSON-строки или text.
- Свой: `initLogger({ transport: myTransport })`.

## Разработка

    npm install          # ставит typescript, @types/node и запускает prepare → dist/
    npm run build        # tsc -p tsconfig.build.json
    npm pack             # создаёт @diplodoc-helper/logger-0.1.0.tgz

## Ограничения

- Внутри diplodocHelper (`require('../utils/logger')`) работает через `index.js`-шим и type-stripping Node ≥ 22.6.
- Внешний потребитель видит только `dist/` (plain JS + d.ts), Node ≥ 18.

## сборка для `node module`

### 3a — tarball (CI-friendly, самый предсказуемый)

```bash
# В diplodocHelper/src/plugins/utils/logger:
npm install                # ставит typescript + @types/node, prepare собирает dist/
npm pack                   # → @diplodoc-helper/logger-0.1.0.tgz
# (prepare вызовется ещё раз — пересоберёт dist/; это ок, быстро)

# В MyProj:
npm install /abs/path/to/diplodoc-helper-logger-0.1.0.tgz
```

?? `npx tsc -p tsconfig.build.json`


### 3b — file-dependency (dev-friendly, правки сразу видны)

```
# В MyProj:
npm install file:/abs/path/to/diplodocHelper/src/plugins/utils/logger
```

### 3c — internal registry
```
# В logger:
npm install
npm publish --registry=https://npm.your-company.local/

# В MyProj:
npm config set @diplodoc-helper:registry https://npm.your-company.local/
npm install @diplodoc-helper/logger
```