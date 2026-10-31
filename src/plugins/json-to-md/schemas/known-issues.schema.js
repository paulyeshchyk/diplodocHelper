'use strict';

/**
 * Схема для known-issues-summary.json.
 *
 * Поля:
 *   label      — заголовок колонки в таблицах
 *   type       — 'string' | 'text' | 'number'
 *   required   — true → предупреждение в лог при отсутствии поля
 *   isDetails  — рендерить как Diplodoc cut «Развернуть» в extended-таблице
 *   multi      — значение может содержать несколько элементов через `separator`
 *   separator  — разделитель (по умолчанию `,`)
 *   hidden     — не выводить в таблицу (служебное)
 */
module.exports = {
  name: 'known-issues',
  fields: {
    id: { label: 'ID', type: 'string', required: true },
    type: { label: 'Тип', type: 'string', required: true },
    severity: { label: 'Severity', type: 'string', required: true },
    module: { label: 'Модуль', type: 'string', required: true, multi: true, separator: ',' },
    title: { label: 'Кратко', type: 'string', required: true },
    details: { label: 'Подробности', type: 'text', required: false, isDetails: true },
  },
  columnOrder: ['id', 'type', 'severity', 'module', 'title', 'details'],
};