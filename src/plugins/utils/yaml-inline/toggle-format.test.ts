// src/plugins/utils/yaml-inline/toggle-format.test.ts

import { describe, expect, it } from '@jest/globals';
import { Yaml_Toggle_Format } from './toggle-format.ts';

const T = Yaml_Toggle_Format.toggle;

describe('Yaml_Toggle_Format.wrap', () => {
  it('00.8.3#01 <b> на чистом тексте — вставка до/после', () => {
    const r = Yaml_Toggle_Format.wrap('abc', 0, 3, 'bold');
    expect(r).toEqual({
      text: '<b>abc</b>',
      newStart: 3, newEnd: 6,
      action: 'wrapped',
      edits: [
        { offset: 3, length: 0, replacement: '</b>' },
        { offset: 0, length: 0, replacement: '<b>' },
      ],
    });
  });
  it('00.8.3#02 wrap на середине строки', () => {
    const r = Yaml_Toggle_Format.wrap('hello world', 6, 11, 'italic');
    expect(r.text).toBe('hello <i>world</i>');
    expect(r.newStart).toBe(9);
    expect(r.newEnd).toBe(14);
  });
  it('00.8.3#03 mono — канонический тег <tt>', () => {
    expect(Yaml_Toggle_Format.wrap('x', 0, 1, 'mono').text).toBe('<tt>x</tt>');
  });
  it('00.8.3#04 canonicalTag — b/i/tt', () => {
    expect(Yaml_Toggle_Format.canonicalTag('bold')).toBe('b');
    expect(Yaml_Toggle_Format.canonicalTag('italic')).toBe('i');
    expect(Yaml_Toggle_Format.canonicalTag('mono')).toBe('tt');
  });
});

describe('Yaml_Toggle_Format.findWrappingPair — сценарий A (selection внутри)', () => {
  it('00.8.3#10 <b>x</b>, selection = x → пара (b)', () => {
    const pair = Yaml_Toggle_Format.findWrappingPair('<b>x</b>', 3, 4, 'bold')!;
    expect(pair).not.toBeNull();
    expect(pair.open.name).toBe('b');
    expect(pair.open.start).toBe(0);
    expect(pair.close.start).toBe(4);
  });
  it('00.8.3#11 <strong>x</strong> → пара (strong), не (b)', () => {
    const pair = Yaml_Toggle_Format.findWrappingPair('<strong>x</strong>', 8, 9, 'bold')!;
    expect(pair.open.name).toBe('strong');
  });
  it('00.8.3#12 <b>abcdef</b>, selection = префикс → пара найдена', () => {
    expect(Yaml_Toggle_Format.findWrappingPair('<b>abcdef</b>', 3, 5, 'bold')).not.toBeNull();
  });
});

describe('Yaml_Toggle_Format.findWrappingPair — сценарий B (selection снаружи)', () => {
  it('00.8.3#15 selection = весь <b>x</b> → пара найдена', () => {
    const pair = Yaml_Toggle_Format.findWrappingPair('<b>x</b>', 0, 8, 'bold')!;
    expect(pair.open.start).toBe(0);
    expect(pair.close.end).toBe(8);
  });
});

describe('Yaml_Toggle_Format.findWrappingPair — не активен', () => {
  it('00.8.3#16 чистый текст → null', () => {
    expect(Yaml_Toggle_Format.findWrappingPair('plain', 0, 5, 'bold')).toBeNull();
  });
  it('00.8.3#17 selection рядом, но не внутри → null', () => {
    expect(Yaml_Toggle_Format.findWrappingPair('<b>x</b>y', 8, 9, 'bold')).toBeNull();
  });
  it('00.8.3#18 selection только на одном теге → null (guard снаружи)', () => {
    // <b>x</b>, selection = <b> (0..3)
    expect(Yaml_Toggle_Format.findWrappingPair('<b>x</b>', 0, 3, 'bold')).toBeNull();
  });
});

describe('Yaml_Toggle_Format.toggle — unwrap сценарий A', () => {
  it('00.8.3#20 <b>[x]</b> → x, selection на x', () => {
    const r = T('<b>x</b>', 3, 4, 'bold');
    expect(r.text).toBe('x');
    expect(r.newStart).toBe(0);
    expect(r.newEnd).toBe(1);
    expect(r.action).toBe('unwrapped');
  });
  it('00.8.3#21 <b>[abc]def</b> → abcdef, selection на abc', () => {
    const r = T('<b>abcdef</b>', 3, 6, 'bold');
    expect(r.text).toBe('abcdef');
    expect(r.newStart).toBe(0);
    expect(r.newEnd).toBe(3);
  });
  it('00.8.3#22 <strong>[x]</strong> → x (удаляется strong, не b)', () => {
    const r = T('<strong>x</strong>', 8, 9, 'bold');
    expect(r.text).toBe('x');
    expect(r.action).toBe('unwrapped');
  });
});

describe('Yaml_Toggle_Format.toggle — unwrap сценарий B', () => {
  it('00.8.3#25 [<b>x</b>] → x, selection на весь контент', () => {
    const r = T('<b>x</b>', 0, 8, 'bold');
    expect(r.text).toBe('x');
    expect(r.newStart).toBe(0);
    expect(r.newEnd).toBe(1);
    expect(r.action).toBe('unwrapped');
  });
  it('00.8.3#26 [<b>abc</b>] → abc, selection на abc', () => {
    const r = T('<b>abc</b>', 0, 10, 'bold');
    expect(r.text).toBe('abc');
    expect(r.newStart).toBe(0);
    expect(r.newEnd).toBe(3);
  });
});

describe('Yaml_Toggle_Format.toggle — multi-level', () => {
  it('00.8.3#30 <b><b>[x]</b></b> → снимает внутренний b', () => {
    const r = T('<b><b>x</b></b>', 6, 7, 'bold');
    expect(r.text).toBe('<b>x</b>');
    expect(r.action).toBe('unwrapped');
  });
  it('00.8.3#31 повторный toggle снимает внешний', () => {
    const r = T('<b>x</b>', 3, 4, 'bold');
    expect(r.text).toBe('x');
  });
});

describe('Yaml_Toggle_Format.toggle — wrap', () => {
  it('00.8.3#40 чистый текст → wrap', () => {
    const r = T('abc', 0, 3, 'bold');
    expect(r.text).toBe('<b>abc</b>');
    expect(r.action).toBe('wrapped');
  });
  it('00.8.3#41 после wrap повторный toggle → unwrap', () => {
    const step1 = T('abc', 0, 3, 'bold');
    const step2 = T(step1.text, step1.newStart, step1.newEnd, 'bold');
    expect(step2.text).toBe('abc');
    expect(step2.action).toBe('unwrapped');
  });
});

describe('Yaml_Toggle_Format.toggle — noop', () => {
  it('00.8.3#50 пустой selection без обёртки → noop', () => {
    const r = T('plain', 3, 3, 'bold');
    expect(r.action).toBe('noop');
    expect(r.text).toBe('plain');
    expect(r.edits).toEqual([]);
  });
  it('00.8.3#51 пустой selection внутри обёртки → unwrap всё равно', () => {
    // <b></b> — граница open.end === close.start, selection = там же
    const r = T('<b></b>', 3, 3, 'bold');
    expect(r.text).toBe('');
    expect(r.action).toBe('unwrapped');
  });
});

// === 4. Frozen snapshot ===
describe('Yaml_Toggle_Format frozen snapshot', () => {
  const cases: ReadonlyArray<readonly [string, number, number, 'bold' | 'italic' | 'mono', string, string]> = [
    ['abc', 0, 3, 'bold', 'wrapped', '<b>abc</b>'],
    ['x', 0, 1, 'italic', 'wrapped', '<i>x</i>'],
    ['x', 0, 1, 'mono', 'wrapped', '<tt>x</tt>'],
    ['<b>x</b>', 3, 4, 'bold', 'unwrapped', 'x'],
    ['<b>x</b>', 0, 8, 'bold', 'unwrapped', 'x'],
    ['<strong>x</strong>', 8, 9, 'bold', 'unwrapped', 'x'],
    ['<b><b>x</b></b>', 6, 7, 'bold', 'unwrapped', '<b>x</b>'],
    ['plain', 3, 3, 'bold', 'noop', 'plain'],
  ];
  it('00.8.3#90 should keep frozen toggle decisions', () => {
    for (const [text, start, end, key, expectedAction, expectedText] of cases) {
      const r = T(text, start, end, key);
      expect(r.action).toBe(expectedAction);
      expect(r.text).toBe(expectedText);
    }
  });
});