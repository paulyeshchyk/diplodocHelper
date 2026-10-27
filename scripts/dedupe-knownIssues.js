#!/usr/bin/env node
'use strict';

// scripts/dedupe-known-issues.js
//
// Удаляет из known-issues-summary.json записи, дублирующие более
// информативные аналоги. Список составлен по результатам ручного
// ревью: для каждой группы оставлен самый подробный вариант
// (обычно с описанием «почему» и «что исправить»).
//
// Использование:
//   node scripts/dedupe-known-issues.js --dry-run       # показать, что удалится
//   node scripts/dedupe-known-issues.js                 # удалить (с бэкапом)
//   node scripts/dedupe-known-issues.js --path foo.json # другой файл
//
// Бэкап: <имя>.backup.json — создаётся один раз, повторный запуск его не трогает.

const fs   = require('fs');
const path = require('path');

// ID → удаляем. Оставшийся «keeper» указан в комментарии к каждому блоку.
const DELETE_IDS = [
  // ── link.Paste: isImage = ext !== 'md'  (keeper: KI-193)
  'KI-001',
  // ── image.PasteFromClipboard: затирает строку  (keeper: KI-158)
  'KI-002',
  // ── calculateNextIndex: всегда '1' на корне  (keeper: KI-487)
  'KI-003',
  // ── manifest: startsWith('')  (keeper: KI-134)
  'KI-005',
  // ── installer: src/scripts не существуют  (keeper: KI-115)
  'KI-006',
  // ── tocCleanMode в фазе pre  (keeper: KI-535)
  'KI-007', 'KI-392',
  // ── getLanguageRoot: «не тот» корень  (keeper: KI-637)
  'KI-008', 'KI-508',
  // ── updateLinksInProject: глотает ошибки  (keeper: KI-640)
  'KI-009', 'KI-445', 'KI-501', 'KI-651',
  // ── TocYamlEntryPatchReference: regex без escape  (keeper: KI-439)
  'KI-013', 'KI-675',
  // ── linter.links: markdown-якоря {#id}  (keeper: KI-372)
  'KI-014',
  // ── [class*="sidebar"] скрывает примеры кода  (keeper: KI-539)
  'KI-015',
  // ── i18n вычисляется один раз  (keeper: KI-380)
  'KI-016',
  // ── xclip с '>' на Linux  (keeper: KI-159)
  'KI-017',
  // ── file.Delete не чистит toc.yaml  (keeper: KI-647)
  'KI-018',
  // ── TocYamlEntryRemove: только index.md  (keeper: KI-636)
  'KI-019', 'KI-503',
  // ── section.Move: неатомарность  (keeper: KI-500)
  'KI-020',
  // ── footnoteNumbering: <ol> в state  (keeper: KI-579)
  'KI-021',
  // ── клиентский скрипт не подключается  (keeper: KI-316)
  'KI-022', 'KI-341',
  // ── Page в Indexed типах  (keeper: KI-454)
  'KI-025', 'KI-449',
  // ── CLI: module.exports 9 из 24  (keeper: KI-100)
  'KI-026',
  // ── helptagmap: excess недостижим  (keeper: KI-278)
  'KI-027',
  // ── context-tags: regex <meta>  (keeper: KI-328)
  'KI-030',
  // ── context-tags: lang = 'index.html'  (keeper: KI-326)
  'KI-031',
  // ── ?clean=0 не выключает режим  (keeper: KI-544)
  'KI-034', 'KI-537',
  // ── sessionStorage: private browsing  (keeper: KI-538)
  'KI-035',
  // ── gosts: клик по ссылке = row-click  (keeper: KI-285)
  'KI-036', 'KI-212',
  // ── gosts: javascript: не блокируется  (keeper: KI-286)
  'KI-037',
  // ── link.Paste HTML: путь без /  (keeper: KI-198)
  'KI-038',
  // ── link.Copy: when без .jpeg/.gif/.webp  (keeper: KI-352)
  'KI-039',
  // ── link.addAnchor: '-' vs slugify  (keeper: KI-216)
  'KI-040',
  // ── isInsideHtmlTag: математика  (keeper: KI-217)
  'KI-041',
  // ── image: altText без escape  (keeper: KI-163)
  'KI-042',
  // ── prompt с незаполненным {0}  (keeper: KI-161)
  'KI-043',
  // ── timestamp в UTC, не локальный  (keeper: KI-169)
  'KI-044',
  // ── workspaceFolders[0]  (keeper: KI-174)
  'KI-045',
  // ── PasteFromList: не заменяет выделение  (keeper: KI-176)
  'KI-046',
  // ── PasteFromList: * / ] в caption  (keeper: KI-179)
  'KI-047',
  // ── reindexer.figures: только inline-ссылки  (keeper: KI-472)
  'KI-048',
  // ── две функции заголовка  (keeper: KI-673)
  'KI-049',
  // ── promptSectionIndex: Escape  (keeper: KI-591)
  'KI-050',
  // ── createDirectory: fs-ошибки  (keeper: KI-595)
  'KI-051', 'KI-594',
  // ── title < > ломают YAML  (keeper: KI-597)
  'KI-052',
  // ── section.Move в корень  (keeper: KI-497)
  'KI-053',
  // ── section.Move: title regex  (keeper: KI-498)
  'KI-054',
  // ── isTypeChanged  (keeper: KI-436)
  'KI-055',
  // ── smart.delete: when без .jpeg  (keeper: KI-661)
  'KI-056',
  // ── smart.delete: race  (keeper: KI-662)
  'KI-057',
  // ── linter.abbrs: код-блоки  (keeper: KI-366)
  'KI-060',
  // ── resolveDocsRoot дублируется  (keeper: KI-375)
  'KI-061', 'KI-363',
  // ── linter: чувствителен к регистру  (keeper: KI-368)
  'KI-062',
  // ── docs-build: process.exit(1)  (keeper: KI-393)
  'KI-063',
  // ── --arg value не поддерживается  (keeper: KI-394)
  'KI-064',
  // ── --only= пустое  (keeper: KI-395)
  'KI-065',
  // ── нет --help  (keeper: KI-101)
  'KI-066',
  // ── injectContainerIntoState не вызывается  (keeper: KI-517)
  'KI-067',
  // ── generateFootnoteListPage не существует  (keeper: KI-518)
  'KI-068',
  // ── выходная папка только через paths.yaml  (keeper: KI-148)
  'KI-069', 'KI-623',
  // ── SKIP_DIRS — глобально  (keeper: KI-149)
  'KI-070',
  // ── многострочные сноски  (keeper: KI-585)
  'KI-072',
  // ── <abbr class> игнорируется  (keeper: KI-150)
  'KI-073',
  // ── <figcaption> — только двойные кавычки  (keeper: KI-258)
  'KI-074',
  // ── --dataRaw теряется  (keeper: KI-105)
  'KI-233',
  // ── ganttFixScroll: buildDir  (keeper: KI-413)
  'KI-106',
  // ── CURRENT_ENGINE = PLANTUML, CLI → MERMAID  (keeper: KI-414)
  'KI-230',
  // ── navLinks дублируются  (keeper: KI-531)
  'KI-266',
  // ── preferredLang — общий ключ  (keeper: KI-533)
  'KI-267', 'KI-386',
  // ── size = .md, не HTML  (keeper: KI-526)
  'KI-274',
  // ── footnoteList не восстанавливает  (keeper: KI-519)
  'KI-308',
  // ── stripLinks вырезает всё  (keeper: KI-522)
  'KI-311',
];

// ───────────── CLI ─────────────
const args   = process.argv.slice(2);
const isDry  = args.includes('--dry-run');
const pIdx   = args.indexOf('--path');
const file   = pIdx !== -1
  ? path.resolve(args[pIdx + 1])
  : path.resolve(process.cwd(), 'known-issues-summary.json');

if (!fs.existsSync(file)) {
  console.error(`❌ Файл не найден: ${file}`);
  process.exit(1);
}

const original = fs.readFileSync(file, 'utf8');
let data;
try { data = JSON.parse(original); }
catch (e) { console.error(`❌ JSON не парсится: ${e.message}`); process.exit(1); }

if (!Array.isArray(data)) {
  console.error('❌ Ожидался массив в корне JSON');
  process.exit(1);
}

// ───────────── Фильтрация ─────────────
const deleteSet = new Set(DELETE_IDS);
const removed   = [];
const kept      = [];
const missing   = new Set(deleteSet);

for (const entry of data) {
  if (entry && typeof entry.id === 'string' && deleteSet.has(entry.id)) {
    removed.push(entry);
    missing.delete(entry.id);
  } else {
    kept.push(entry);
  }
}

// ───────────── Отчёт ─────────────
console.log('📊 Итог:');
console.log(`   Было:     ${data.length}`);
console.log(`   Стало:    ${kept.length}`);
console.log(`   Удалено:  ${removed.length}`);

if (removed.length) {
  console.log('\n🗑️  Удаляем:');
  for (const e of removed) {
    console.log(`   ${e.id.padEnd(8)} ${e.title || ''}`);
  }
}

if (missing.size) {
  console.warn('\n⚠️  В списке, но нет в JSON:');
  for (const id of [...missing].sort()) console.warn(`   ${id}`);
}

if (isDry) {
  console.log('\n🔍 --dry-run: файл не изменён.');
  process.exit(0);
}

// ───────────── Бэкап + запись ─────────────
const backup = file.replace(/\.json$/i, '.backup.json');
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, original, 'utf8');
  console.log(`\n💾 Бэкап: ${path.relative(process.cwd(), backup)}`);
} else {
  console.log(`\n💾 Бэкап уже есть: ${path.relative(process.cwd(), backup)}`);
}

fs.writeFileSync(file, JSON.stringify(kept, null, 2) + '\n', 'utf8');
console.log(`✅ Записано: ${path.relative(process.cwd(), file)}`);