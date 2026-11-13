### Known Issues
- `[MODULE_TYPELESS_PACKAGE_JSON]` warning при запуске `run-pipeline` —
  для `.ts`-файлов в `src/plugins/**`. Известная проблема, см. REFACTORING.md §10.4.
  Будет устранена в Wave 6 (прекомпиляция `.ts` → `.js`).

### Changed
- `logLevel: off` в `plugins.config.yaml` теперь **реально** глушит прогресс пайплайна
  (раньше `console.log` работал безусловно). Дефолт — `info` (прогресс виден как раньше).
- Префикс `[runner] INFO` у прогресс-сообщений (было `▶ module` без префикса).