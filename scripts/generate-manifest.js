const fs = require('fs');
const path = require('path');

const contributesDir = path.resolve(__dirname, '../src/manifest/contributes');

try {
    console.log('Читаем текущий package.json...');
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    console.log('Собираем contributes из папки...');

    const contributes = {};

    // Автоматически берём все .json файлы из папки contributes
    const files = fs.readdirSync(contributesDir).filter(file => file.endsWith('.json') && file !== 'index.json');

    for (const file of files.sort()) {
        const filePath = path.join(contributesDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (content.contributes) {
            for (const [key, value] of Object.entries(content.contributes)) {
                if (!contributes[key]) {
                    contributes[key] = Array.isArray(value) ? [] : {};
                }

                if (Array.isArray(contributes[key]) && Array.isArray(value)) {
                    contributes[key].push(...value);
                } else if (typeof contributes[key] === 'object' && typeof value === 'object') {
                    // Глубокое слияние для menus и configuration
                    contributes[key] = { ...contributes[key], ...value };
                } else {
                    contributes[key] = value;
                }
            }
            console.log(`    ${file}`);
        }
    }

    const finalManifest = {
        ...originalPackage,
        contributes: contributes,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(finalManifest, null, 4));

    console.log('\n Manifest успешно собран!');
    console.log(`   Секций в contributes: ${Object.keys(contributes).length}`);
    console.log(`   Команд: ${contributes.commands ? contributes.commands.length : 0}`);
} catch (error) {
    console.error('Ошибка генерации манифеста:');
    console.error(error.message);
    process.exit(1);
}
