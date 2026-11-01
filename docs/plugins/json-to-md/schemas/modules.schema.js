'use strict';

module.exports = {
  name: 'modules',
  fields: {
    id:         { label: 'ID',         type: 'string', required: true },
    ident:      { label: 'Модуль',     type: 'string', required: true },
    layer:      { label: 'Слой',       type: 'string', required: false },
    family:     { label: 'Семейство',  type: 'string', required: false },
    capability: { label: 'Каталог',    type: 'string', required: false },
    folder:     { label: 'Папка',      type: 'string', required: false },
  },
  columnOrder: ['id', 'ident', 'layer', 'family', 'capability', 'folder'],
};