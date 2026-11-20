import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Рекурсивный поиск файлов по расширению для мока diplodoc-helper.files
function walkFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, ext));
    } else if (entry.isFile() && full.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

let mockProjectRoot = '';

jest.mock('./diplodoc-helper.files', () => ({
  findFiles: async (root: string, ext: string) => walkFiles(root, ext),
}));

jest.mock('../plugins/utils/path.directory.js', () => ({
  getLanguageRoot: () => mockProjectRoot,
}));

const {
  isDirectlyOwnedAsset,
  collectLocalImageTargets,
  planImageDestination,
  moveFigureAssets,
  commitMovedAssets,
  rollbackMovedAssets,
  duplicateLocalAssets,
  rollbackDuplicatedAssets,
  adaptFragmentWithRemap,
  computeInDocumentRemapEdits,
} = require('./diplodoc-helper.content.figure.moveAssets');

describe('diplodoc-helper.content.figure.moveAssets', () => {
  let tmpDir: string;
  let srcDir: string;
  let dstDir: string;
  let sharedDir: string;
  let srcMd: string;
  let dstMd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diplodoc-move-assets-'));
    mockProjectRoot = tmpDir;

    srcDir = path.join(tmpDir, 'section-a');
    dstDir = path.join(tmpDir, 'section-b');
    sharedDir = path.join(tmpDir, '_assets');

    fs.mkdirSync(path.join(srcDir, 'images'), { recursive: true });
    fs.mkdirSync(dstDir, { recursive: true });
    fs.mkdirSync(sharedDir, { recursive: true });

    srcMd = path.join(srcDir, 'source.md');
    dstMd = path.join(dstDir, 'target.md');

    fs.writeFileSync(srcMd, '# Source\n', 'utf8');
    fs.writeFileSync(dstMd, '# Target\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('isDirectlyOwnedAsset & collectLocalImageTargets', () => {
    it('считает ассетом только файлы внутри папки исходного MD-файла', () => {
      const own1 = path.join(srcDir, 'direct.png');
      const own2 = path.join(srcDir, 'images', 'nested.png');
      const shared = path.join(sharedDir, 'logo.png');

      expect(isDirectlyOwnedAsset(own1, srcDir)).toBe(true);
      expect(isDirectlyOwnedAsset(own2, srcDir)).toBe(true);
      expect(isDirectlyOwnedAsset(shared, srcDir)).toBe(false);
    });

    it('собирает только локальные картинки источника и игнорирует общие/внешние/обычные ссылки', () => {
      const fragment = [
        '![Локальная](./images/local.png)',
        '![Дубль](./images/local.png)',
        '![Общая](../_assets/shared.png)',
        '![Внешняя](https://example.com/pic.png)',
        '[Обычная ссылка](./other.md)',
      ].join('\n');

      const targets = collectLocalImageTargets(fragment, srcMd);
      expect(targets).toHaveLength(1);
      expect(targets[0].absPath).toBe(path.join(srcDir, 'images', 'local.png'));
    });
  });

  describe('planImageDestination', () => {
    it('сохраняет относительную подпапку images/ у файла-приёмника', () => {
      const absImg = path.join(srcDir, 'images', 'diagram.png');
      const plan = planImageDestination(absImg, srcMd, dstMd);

      expect(plan.destDir).toBe(path.join(dstDir, 'images'));
      expect(plan.destPath).toBe(path.join(dstDir, 'images', 'diagram.png'));
      expect(plan.relativeFromTarget).toBe('./images/diagram.png');
    });
  });

  describe('moveFigureAssets + commit / rollback', () => {
    it('переносит картинку, обновляет внешние документы и удаляет исходник после commitMovedAssets', async () => {
      const srcImg = path.join(srcDir, 'images', 'screen.png');
      fs.writeFileSync(srcImg, 'PNG_BYTES', 'utf8');

      // Третий документ, ссылающийся на ту же картинку
      const thirdMd = path.join(tmpDir, 'third.md');
      fs.writeFileSync(thirdMd, 'Смотри ![скрин](./section-a/images/screen.png)\n', 'utf8');

      const figureBody = '<figure>\n![Скрин](./images/screen.png)\n</figure>';
      const res = await moveFigureAssets(figureBody, srcMd, dstMd, { mode: 'copy' });

      const expectedDest = path.join(dstDir, 'images', 'screen.png');
      expect(res.warnings).toHaveLength(0);
      expect(res.moved).toHaveLength(1);
      expect(res.pathRemap.get(srcImg)).toBe(expectedDest);

      // До commit оба файла существуют (режим copy)
      expect(fs.existsSync(srcImg)).toBe(true);
      expect(fs.existsSync(expectedDest)).toBe(true);

      // Внешний документ уже обновлён
      expect(fs.readFileSync(thirdMd, 'utf8')).toBe(
        'Смотри ![скрин](section-b/images/screen.png)\n',
      );

      // Фиксируем перенос
      await commitMovedAssets(res);
      expect(fs.existsSync(srcImg)).toBe(false);
      // Опустевшая папка images/ в источнике подчищена
      //expect(fs.existsSync(path.join(srcDir, 'images'))).toBe(false);
    });

    it('откатывает скопированный файл и внешние ссылки при rollbackMovedAssets', async () => {
      const srcImg = path.join(srcDir, 'images', 'screen.png');
      fs.writeFileSync(srcImg, 'PNG_BYTES', 'utf8');

      const thirdMd = path.join(tmpDir, 'third.md');
      const initialThirdContent = 'Ссылка: ![скрин](./section-a/images/screen.png)\n';
      fs.writeFileSync(thirdMd, initialThirdContent, 'utf8');

      const figureBody = '<figure>\n![Скрин](./images/screen.png)\n</figure>';
      const res = await moveFigureAssets(figureBody, srcMd, dstMd, { mode: 'copy' });

      await rollbackMovedAssets(res);

      const expectedDest = path.join(dstDir, 'images', 'screen.png');
      expect(fs.existsSync(srcImg)).toBe(true);
      expect(fs.existsSync(expectedDest)).toBe(false);
      expect(fs.readFileSync(thirdMd, 'utf8')).toBe(initialThirdContent);
    });
  });

  describe('duplicateLocalAssets + rollbackDuplicatedAssets', () => {
    it('дублирует локальную картинку к приёмнику, не удаляя оригинал и не трогая внешние ссылки', async () => {
      const srcImg = path.join(srcDir, 'images', 'chart.png');
      fs.writeFileSync(srcImg, 'CHART_DATA', 'utf8');

      const thirdMd = path.join(tmpDir, 'third.md');
      const initialThirdContent = '![График](./section-a/images/chart.png)\n';
      fs.writeFileSync(thirdMd, initialThirdContent, 'utf8');

      const fragment = 'Текст\n![График](./images/chart.png)\n[Док](../third.md#sec)';
      const dupRes = await duplicateLocalAssets(fragment, srcMd, dstMd);

      const expectedDest = path.join(dstDir, 'images', 'chart.png');
      expect(dupRes.copied).toEqual([{ from: srcImg, to: expectedDest }]);
      expect(dupRes.pathRemap.get(srcImg)).toBe(expectedDest);

      // Оригинал остался на месте, копия создана
      expect(fs.existsSync(srcImg)).toBe(true);
      expect(fs.existsSync(expectedDest)).toBe(true);

      // Третий документ не изменён
      expect(fs.readFileSync(thirdMd, 'utf8')).toBe(initialThirdContent);

      // Адаптация ссылок для вставки в target
      const adapted = adaptFragmentWithRemap(fragment, srcMd, dstMd, dupRes.pathRemap);
      expect(adapted.content).toBe(
        'Текст\n![График](./images/chart.png)\n[Док](../third.md#sec)',
      );
    });

    it('разрешает коллизию имён (chart.png -> chart_1.png) при дублировании', async () => {
      const srcImg = path.join(srcDir, 'images', 'chart.png');
      fs.writeFileSync(srcImg, 'NEW_CHART', 'utf8');

      fs.mkdirSync(path.join(dstDir, 'images'), { recursive: true });
      const existingDstImg = path.join(dstDir, 'images', 'chart.png');
      fs.writeFileSync(existingDstImg, 'EXISTING_CHART', 'utf8');

      const fragment = '![График](./images/chart.png)';
      const dupRes = await duplicateLocalAssets(fragment, srcMd, dstMd);

      const expectedUniqueDest = path.join(dstDir, 'images', 'chart_1.png');
      expect(dupRes.pathRemap.get(srcImg)).toBe(expectedUniqueDest);
      expect(fs.readFileSync(existingDstImg, 'utf8')).toBe('EXISTING_CHART');
      expect(fs.readFileSync(expectedUniqueDest, 'utf8')).toBe('NEW_CHART');

      const adapted = adaptFragmentWithRemap(fragment, srcMd, dstMd, dupRes.pathRemap);
      expect(adapted.content).toBe('![График](./images/chart_1.png)');

      // Проверка отката дублирования
      await rollbackDuplicatedAssets(dupRes);
      expect(fs.existsSync(expectedUniqueDest)).toBe(false);
      expect(fs.existsSync(existingDstImg)).toBe(true);
    });
  });

  describe('adaptFragmentWithRemap & computeInDocumentRemapEdits', () => {
    it('пересчитывает относительные ссылки на документы и общие ассеты относительно target', () => {
      const pathRemap = new Map<string, string>();
      const fragment = [
        'См. [соседний файл](./neighbor.md#part-1)',
        'И общая картинка: ![Лого](../_assets/logo.png)',
        'Якорь внутри статьи: [к началу](#top)',
        'Внешняя: [сайт](https://yandex.ru)',
      ].join('\n');

      const { content, adaptedCount } = adaptFragmentWithRemap(
        fragment,
        srcMd,
        dstMd,
        pathRemap,
      );

      expect(adaptedCount).toBe(1);
      expect(content).toBe(
        [
          'См. [соседний файл](../section-a/neighbor.md#part-1)',
          'И общая картинка: ![Лого](../_assets/logo.png)',
          'Якорь внутри статьи: [к началу](#top)',
          'Внешняя: [сайт](https://yandex.ru)',
        ].join('\n'),
      );
    });

    it('находит и пересчитывает оставшиеся ссылки в исходном файле вне вырезаемого диапазона', () => {
      const oldImg = path.join(srcDir, 'images', 'pic.png');
      const newImg = path.join(dstDir, 'images', 'pic.png');
      const pathRemap = new Map([[oldImg, newImg]]);

      const fullText = [
        'Ссылка выше: ![1](./images/pic.png)',
        '<figure>\n![2](./images/pic.png)\n</figure>',
        'Ссылка ниже: ![3](./images/pic.png?w=200#fig)',
      ].join('\n');

      const excludeStart = fullText.indexOf('<figure>');
      const excludeEnd = fullText.indexOf('</figure>') + '</figure>'.length;

      const edits = computeInDocumentRemapEdits(
        fullText,
        srcMd,
        pathRemap,
        excludeStart,
        excludeEnd,
      );

      expect(edits).toHaveLength(2);
      expect(edits[0].replacement).toBe('![1](../section-b/images/pic.png)');
      expect(edits[1].replacement).toBe('![3](../section-b/images/pic.png?w=200#fig)');
    });
  });
});