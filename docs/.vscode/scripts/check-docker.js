const { execSync } = require('child_process');
try {
    execSync('docker version', { stdio: 'ignore' });
    console.log('✅ Docker готов к работе');
    process.exit(0);
} catch {
    console.log('❌ Docker Desktop не запущен! Запустите Docker Desktop и повторите попытку.');
    process.exit(1);
}