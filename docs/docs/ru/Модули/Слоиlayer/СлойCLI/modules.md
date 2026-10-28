
| ID                                                                                                                                                                                                                 | Модуль                | Что                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------ |
| [6.2-046](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8CCLI/index.md#naznachenie)                                                                                                    | `diplodoc-helper-cli` | 24 подкоманды      |
| [6.2-047](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9E%D1%80%D0%BA%D0%B5%D1%81%D1%82%D1%80%D0%B0%D1%82%D0%BE%D1%80%D1%81%D0%B1%D0%BE%D1%80%D0%BA%D0%B8/index.md#naznachenie) | `docs-build`          | Оркестратор сборки |

### Состав

- `src/plugins/diplodoc-helper-cli.js` — диспетчер подкоманд; аргументы `--docsDir`, `--outputDir`, `--section`, `--targetHtml`.
- `src/plugins/docs-build.js` — фазы `pre`, `build`, `post`; флаги `--phase`, `--only`, `--skip`, `--list`, `--help`.
- `build.js` — сборка расширения (`NODE_ENV=production` → минификация, без sourcemap).
- `src/plugins/docs-build.cmd` — Windows-шим для `docs-build.js`.
