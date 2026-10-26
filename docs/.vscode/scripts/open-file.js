const filePath = process.argv[2];
if (!filePath) {
    console.error('❌ Файл не указан');
    process.exit(1);
}

const { spawn } = require('child_process');
let cmd, args;

if (process.platform === 'win32') {
    cmd = 'cmd.exe';
    args = ['/c', 'start', '""', filePath];
} else if (process.platform === 'darwin') {
    cmd = 'open';
    args = [filePath];
} else {
    cmd = 'xdg-open';
    args = [filePath];
}

const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
child.unref();
process.exit(0);