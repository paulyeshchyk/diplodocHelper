const { execSync } = require('child_process');
const imageName = process.argv[2]; // ожидаем имя образа, например gulf-help-demo

if (!imageName) {
    console.error('❌ Имя образа не указано');
    process.exit(1);
}

try {
    // Получаем ID запущенных контейнеров, созданных из данного образа
    const output = execSync(`docker ps -q --filter ancestor=${imageName}`, { encoding: 'utf8' });
    const containerIds = output.trim().split('\n').filter(id => id);
    
    if (containerIds.length === 0) {
        console.log(`ℹ️ Нет запущенных контейнеров из образа "${imageName}"`);
        process.exit(0);
    }
    
    for (const id of containerIds) {
        execSync(`docker stop ${id}`, { stdio: 'ignore' });
        console.log(`✅ Остановлен контейнер ${id}`);
    }
} catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    process.exit(1);
}