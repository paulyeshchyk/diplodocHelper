---
title: Каталог. Инфраструктура
sectionType: Page
pureTitle: Каталог. Инфраструктура
sectionIndex: ""
---

### Инфраструктура {#infrastruktura}

Оркестрация и сборка. Часть — **для пользователя** (CLI, installer), часть — **внутренняя** (manifest, build.js).

| ID                                                         | Модуль                | Что делает                           | Тип              |
| ---------------------------------------------------------- | --------------------- | ------------------------------------ | ---------------- |
| [6.2-046](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8CCLI/index.md#naznachenie)               | `diplodoc-helper-cli` | CLI-диспетчер 24 подкоманд           | для пользователя |
| [6.2-047](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9E%D1%80%D0%BA%D0%B5%D1%81%D1%82%D1%80%D0%B0%D1%82%D0%BE%D1%80%D1%81%D0%B1%D0%BE%D1%80%D0%BA%D0%B8/index.md#naznachenie) | `docs-build`          | Оркестратор `pre` → `build` → `post` | для пользователя |
| [6.2-049](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8CInstaller/index.md#naznachenie)         | `installer`           | Копирует скрипты в проект            | для пользователя |
| [6.2-048](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8CManifest/index.md#naznachenie)          | `manifest`            | Генератор `contributes`              | внутреннее       |
| [6.2-050](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%A1%D0%B1%D0%BE%D1%80%D0%BA%D0%B0%D1%80%D0%B0%D1%81%D1%88%D0%B8%D1%80%D0%B5%D0%BD%D0%B8%D1%8F/index.md#naznachenie)  | `build.js`            | esbuild-сборка расширения            | внутреннее       |
