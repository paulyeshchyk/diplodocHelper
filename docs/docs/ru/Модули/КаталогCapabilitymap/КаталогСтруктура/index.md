---
title: Каталог. Структура
sectionType: Page
pureTitle: Каталог. Структура
sectionIndex: ""
---

### Структура {#struktura}

Управление деревом секций: создание, удаление, переименование, перемещение, пересчёт индексов. **Базовая** capability — без неё нет документации как «дерева разделов».

| ID                                                            | Модуль                  | Что делает                              |
| ------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| [1.1-022](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%AF%D0%B4%D1%80%D0%BE%D1%81%D0%B5%D0%BA%D1%86%D0%B8%D0%B9/index.md#naznachenie)           | `sections.core`         | Общие утилиты для операций над секциями |
| [1.1-023](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%A1%D0%BE%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5%D1%81%D0%B5%D0%BA%D1%86%D0%B8%D0%B8/index.md#naznachenie)       | `section.Create`        | Создаёт папку-секцию с тремя файлами    |
| [1.1-024](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%A3%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%D1%81%D0%B5%D0%BA%D1%86%D0%B8%D0%B8/index.md#naznachenie)       | `section.Delete`        | Удаляет секцию с очисткой `toc.yaml`    |
| [1.1-025](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D0%B5%D1%81%D0%B5%D0%BA%D1%86%D0%B8%D0%B8/index.md#naznachenie)    | `section.Move`          | Переносит секцию в другого родителя     |
| [1.1-026](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BC%D0%B5%D0%BD%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5%D1%81%D0%B5%D0%BA%D1%86%D0%B8%D0%B8/index.md#naznachenie) | `section.Rename`        | Меняет имя/тип/индекс секции            |
| [1.2-039](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%A3%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%D1%84%D0%B0%D0%B9%D0%BB%D0%B0/index.md#naznachenie)        | `file.Delete`           | Удаляет файл/папку с очисткой ссылок    |
| [1.2-040](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%A3%D0%BC%D0%BD%D0%BE%D0%B5%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5/index.md#naznachenie)        | `smart.delete`          | Маршрутизатор: секция или файл          |
| [1.2-041](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%D0%B0%D1%86%D0%B8%D1%8F%D0%BF%D0%B0%D0%BF%D0%BE%D0%BA/index.md#naznachenie)  | `reindexer.directories` | Массовая переиндексация дерева          |
| [1.2-043](../../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%D0%B0%D1%86%D0%B8%D1%8F%D1%81%D1%82%D0%B0%D1%82%D0%B5%D0%B9/index.md#naznachenie) | `reindexer.md`          | Вычисляет следующий `sectionIndex`      |
