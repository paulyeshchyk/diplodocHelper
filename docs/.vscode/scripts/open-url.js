const url = process.argv[2];
if (!url) {
    console.error('❌ URL not provided');
    process.exit(1);
}

const { spawn } = require('child_process');
let cmd, args;

if (process.platform === 'win32') {
    cmd = 'cmd.exe';
    args = ['/c', 'start', url];
} else if (process.platform === 'darwin') {
    cmd = 'open';
    args = [url];
} else {
    cmd = 'xdg-open';
    args = [url];
}

// Запускаем браузер в фоне
const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
child.unref();
process.exit(0);