import { describe, expect, it } from '@jest/globals';

const {
  findFigureBlocks,
  validateFigureIntegrity,
  getFiguresFullyInside,
} = require('./diplodoc-helper.content.figure.validate');

describe('diplodoc-helper.content.figure.validate', () => {
  const sampleFigure = [
    '<figure>',
    '',
    '![Описание](./images/pic.png)',
    '',
    '<figcaption class="imageDescription" id="fig-pic">Рисунок 1. Описание</figcaption>',
    '',
    '</figure>',
  ].join('\n');

  describe('findFigureBlocks', () => {
    it('находит корректно закрытый блок <figure>', () => {
      const text = `Текст до\n\n${sampleFigure}\n\nТекст после`;
      const blocks = findFigureBlocks(text);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].incomplete).toBe(false);
      expect(blocks[0].body).toBe(sampleFigure);
      expect(text.slice(blocks[0].start, blocks[0].end)).toBe(sampleFigure);
    });

    it('находит несколько блоков <figure> подряд', () => {
      const text = `${sampleFigure}\n\nАбзац\n\n${sampleFigure}`;
      const blocks = findFigureBlocks(text);

      expect(blocks).toHaveLength(2);
      expect(blocks.every((b: { incomplete: boolean }) => !b.incomplete)).toBe(true);
    });

    it('помечает незакрытый <figure> как incomplete: true', () => {
      const text = 'Начало\n<figure>\n![alt](./img.png)\nКонец без закрывающего тега';
      const blocks = findFigureBlocks(text);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].incomplete).toBe(true);
      expect(blocks[0].start).toBe(text.indexOf('<figure>'));
      expect(blocks[0].end).toBe(text.length);
    });

    it('игнорирует теги <figure> внутри fenced code blocks (``` и ~~~)', () => {
      const text = [
        'Пример в коде:',
        '```html',
        '<figure>',
        '  <img src="broken.png">',
        '<!-- специально не закрыт -->',
        '```',
        '',
        '~~~html',
        '<figure><figcaption>Еще пример</figcaption></figure>',
        '~~~',
        '',
        sampleFigure,
      ].join('\n');

      const blocks = findFigureBlocks(text);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].incomplete).toBe(false);
      expect(blocks[0].body).toBe(sampleFigure);
    });
  });

  describe('validateFigureIntegrity', () => {
    it('разрешает выделение текста без <figure>', () => {
      const text = `Первый абзац.\n\n${sampleFigure}\n\nВторой абзац.`;
      const start = 0;
      const end = 'Первый абзац.'.length;

      expect(validateFigureIntegrity(text, start, end)).toEqual({ ok: true });
    });

    it('разрешает выделение, которое полностью включает <figure>', () => {
      const text = `До\n${sampleFigure}\nПосле`;
      const start = text.indexOf('<figure>');
      const end = text.indexOf('</figure>') + '</figure>'.length;

      expect(validateFigureIntegrity(text, start, end)).toEqual({ ok: true });
    });

    it('запрещает выделение, захватывающее только начало <figure>', () => {
      const text = `До\n${sampleFigure}\nПосле`;
      const start = text.indexOf('<figure>');
      const end = text.indexOf('</figure>'); // не дотянули до закрывающего тега

      const res = validateFigureIntegrity(text, start, end);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toMatch(/частично/i);
      }
    });

    it('запрещает выделение, захватывающее только хвост <figure>', () => {
      const text = `До\n${sampleFigure}\nПосле`;
      const start = text.indexOf('![Описание]');
      const end = text.length;

      const res = validateFigureIntegrity(text, start, end);
      expect(res.ok).toBe(false);
    });

    it('запрещает выделение, пересекающее незакрытый <figure>', () => {
      const text = 'Текст\n<figure>\n![alt](./a.png)\nЕщё текст';
      const res = validateFigureIntegrity(text, 0, text.length);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toMatch(/незакрытый/i);
      }
    });
  });

  describe('getFiguresFullyInside', () => {
    it('возвращает только те <figure>, которые целиком попали в диапазон выделения', () => {
      const fig1 = '<figure>\n![1](./1.png)\n</figure>';
      const fig2 = '<figure>\n![2](./2.png)\n</figure>';
      const text = `${fig1}\n\nТекст\n\n${fig2}`;

      const selStart = text.indexOf('Текст');
      const selEnd = text.length;

      const inside = getFiguresFullyInside(text, selStart, selEnd);
      expect(inside).toHaveLength(1);
      expect(inside[0].body).toBe(fig2);
    });
  });
});