const { spawn } = require('child_process');
const path = require('path');

const port = process.env.npm_config_port || process.argv[2] || 5050;

// Определяем команду и аргументы
// Используем npx, но если http-server установлен локально, можно вызывать напрямую
const cmd = 'npx';
const args = [
    '-y',               // yes, автоматически согласиться на установку
    'http-server',
    './build',
    '--port', port,
    '--cors'
];

// Запускаем процесс с наследованием stdio, чтобы VS Code видел вывод
const server = spawn(cmd, args, {
    stdio: 'inherit',   // весь вывод идёт в терминал VS Code
    shell: true         // нужно для корректной работы npx на Windows
});

// Обработка завершения (если нужно)
server.on('close', (code) => {
    if (code !== 0) {
        console.error(`❌ HTTP server exited with code ${code}`);
        process.exit(code);
    }
});

// Держим процесс живым (не завершаем скрипт)
process.stdin.resume();