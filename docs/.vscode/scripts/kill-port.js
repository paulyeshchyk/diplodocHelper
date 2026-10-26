const port = process.argv[2];
const { execSync } = require('child_process');
try {
    execSync(`npx kill-port ${port}`, { stdio: 'inherit' });
    console.log(`Порт ${port} освобождён`);
} catch {
    console.log(`Порт ${port} не был занят`);
}