const fs = require('fs');
const path = require('path');

const candidates = [
  'coverage/lcov-report/index.html',
  'coverage/index.html',
];
const abs = candidates.map(p => path.resolve(p)).find(p => fs.existsSync(p));

if (!abs) {
  console.error('Coverage report not found. Run `npm test` first.');
  process.exit(0);
}

const label = 'Coverage report'; // Текст, который будет ссылкой

// Проверяем, поддерживает ли терминал гиперссылки.
// VS Code и Windows Terminal поддерживаются.
const supportsOSC8 =
  process.stdout.isTTY &&
  (process.env.TERM_PROGRAM === 'vscode' || process.env.WT_SESSION);

if (supportsOSC8) {
  // Выводим кликабельную ссылку
  console.log(`\n\x1b]8;;${abs}\x07Coverage report\x1b]8;;\x07\n`);
} else {
  // Фолбэк для неподдерживаемых терминалов
  console.log(`\n${label}: ${abs}`);
}