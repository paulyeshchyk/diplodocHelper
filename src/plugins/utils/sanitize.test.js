const { Sanitizer } = require('./sanitize');

describe('Sanitizer.stripTags', () => {
  test('leaves plain text untouched', () => {
    expect(Sanitizer.stripTags('ГОСТ 1234-78')).toBe('ГОСТ 1234-78');
  });
  test('removes HTML tags', () => {
    expect(Sanitizer.stripTags('<b>ГОСТ</b> 1234')).toBe('ГОСТ 1234');
  });
  test('decodes entities', () => {
    expect(Sanitizer.stripTags('a &amp; b')).toBe('a b');
  });
  test('removes YAML-dangerous chars', () => {
    expect(Sanitizer.stripTags('a * b ! c & d')).toBe('a b c d');
  });
  test('collapses whitespace', () => {
    expect(Sanitizer.stripTags('  a   b  ')).toBe('a b');
  });
  test('handles null / undefined / non-string', () => {
    expect(Sanitizer.stripTags(null)).toBe('');
    expect(Sanitizer.stripTags(undefined)).toBe('');
    expect(Sanitizer.stripTags(42)).toBe('42');
  });
  test('empty after stripping everything', () => {
    expect(Sanitizer.stripTags('<script>x</script>')).toBe('x');
    expect(Sanitizer.stripTags('<>!&*')).toBe('');
  });
});

describe('Sanitizer.sanitizeHtml', () => {
  test('keeps allowed tags: a, abbr, code, ...', () => {
    expect(Sanitizer.sanitizeHtml('<a href="https://e.com">x</a>'))
      .toBe('<a href="https://e.com">x</a>');
    expect(Sanitizer.sanitizeHtml('<abbr title="t">x</abbr>'))
      .toBe('<abbr title="t">x</abbr>');
  });
  test('strips forbidden tags but keeps content', () => {
    expect(Sanitizer.sanitizeHtml('<div onclick="x">y</div>')).toBe('y');
  });
  test('removes dangerous block tags with content', () => {
    expect(Sanitizer.sanitizeHtml('<script>alert(1)</script>after')).toBe('after');
  });
  test('strips forbidden attributes but keeps allowed', () => {
    expect(Sanitizer.sanitizeHtml('<a href="x" onclick="y">z</a>'))
      .toBe('<a href="x">z</a>');
  });
  test('rejects javascript: URLs', () => {
    expect(Sanitizer.sanitizeHtml('<a href="javascript:alert(1)">x</a>'))
      .toBe('<a>x</a>');
  });
  test('allows relative and anchor URLs', () => {
    expect(Sanitizer.sanitizeHtml('<a href="#top">x</a>'))
      .toBe('<a href="#top">x</a>');
    expect(Sanitizer.sanitizeHtml('<a href="./page.md">x</a>'))
      .toBe('<a href="./page.md">x</a>');
  });
  test('keeps data-* and aria-* attributes', () => {
    expect(Sanitizer.sanitizeHtml('<span data-abbr="GOST" aria-label="x">y</span>'))
      .toBe('<span data-abbr="GOST" aria-label="x">y</span>');
  });
  test('passes through plain text', () => {
    expect(Sanitizer.sanitizeHtml('plain [markdown](url)')).toBe('plain [markdown](url)');
  });
  test('handles null / undefined', () => {
    expect(Sanitizer.sanitizeHtml(null)).toBe('');
    expect(Sanitizer.sanitizeHtml(undefined)).toBe('');
  });
  test('handles <abbr class="term" data-term="x">y</abbr> (real use case)', () => {
    expect(Sanitizer.sanitizeHtml('<abbr class="term" data-term="x">y</abbr>'))
      .toBe('<abbr class="term" data-term="x">y</abbr>');
  });

  test('removes onerror in <img>', () => {
    expect(Sanitizer.sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('');
  });

  test('unclosed <b> passes through (known limitation)', () => {
    expect(Sanitizer.sanitizeHtml('<b>text')).toBe('<b>text');
  });

  test('handles > inside attribute value', () => {
    expect(Sanitizer.sanitizeHtml('<a title="x > y">t</a>')).toBe('<a title="x &gt; y">t</a>');
  });

  test('stripTags keeps dots and dashes', () => {
    expect(Sanitizer.stripTags('ГОСТ 1234-78. п. 5.1')).toBe('ГОСТ 1234-78. п. 5.1');
  });

  test('stripTags mangles email (documented behavior)', () => {
    expect(Sanitizer.stripTags('a@b.com')).toBe('a b.com');
  });

  test('allows bare relative paths', () => {
    expect(Sanitizer.sanitizeHtml('<a href="page.md">t</a>'))
      .toBe('<a href="page.md">t</a>');
    expect(Sanitizer.sanitizeHtml('<a href="sub/file.md">t</a>'))
      .toBe('<a href="sub/file.md">t</a>');
  });
  test('rejects protocol-relative URLs', () => {
    expect(Sanitizer.sanitizeHtml('<a href="//evil.com/x">t</a>'))
      .toBe('<a>t</a>');
  });
  test('rejects data: and file: URLs', () => {
    expect(Sanitizer.sanitizeHtml('<a href="data:text/html,x">t</a>'))
      .toBe('<a>t</a>');
    expect(Sanitizer.sanitizeHtml('<a href="file:///etc/passwd">t</a>'))
      .toBe('<a>t</a>');
  });

  test('00.9.5#01 keeps <kbd> — canonical mono for YAML format', () => {
    expect(Sanitizer.sanitizeHtml('<kbd>Enter</kbd>')).toBe('<kbd>Enter</kbd>');
  });

  test('00.9.5#02 strips attributes from <kbd> (only global whitelist)', () => {
    expect(Sanitizer.sanitizeHtml('<kbd onclick="x">y</kbd>')).toBe('<kbd>y</kbd>');
  });

  test('00.9.5#03 stripTags removes <kbd> in identity fields', () => {
    expect(Sanitizer.stripTags('<kbd>x</kbd>')).toBe('x');
  });
})
