const { execSync } = require('child_process');
const imageName = process.argv[2];

if (!imageName) {
    console.error('❌ Имя образа не указано');
    process.exit(1);
}

try {
    // Ищем все контейнеры (и работающие, и остановленные) из этого образа
    const output = execSync(`docker ps -a -q --filter ancestor=${imageName}`, { encoding: 'utf8' });
    const containerIds = output.trim().split('\n').filter(id => id);
    
    if (containerIds.length === 0) {
        console.log(`ℹ️ Нет контейнеров из образа "${imageName}"`);
        process.exit(0);
    }
    
    for (const id of containerIds) {
        // Принудительно удаляем контейнер (даже если он работает)
        execSync(`docker rm -f ${id}`, { stdio: 'ignore' });
        console.log(`✅ Удалён контейнер ${id}`);
    }
} catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    process.exit(1);
}