const fs = require('fs');
const path = require('path');

const contributesDir = path.resolve(__dirname, '../src/manifest/contributes');
const { generateConfigurationContribute } = require('../src/commands/vscode.config.contribute.generate');
/** @import {ContributesManifest} from '../src/plugins/model/vscode.contributes.model' */

try {
    console.log('Читаем текущий package.json...');
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    console.log('Собираем contributes...');

    /** @type {ContributesManifest} */
    const contributes = {};

    // Автоматически собираем все файлы кроме configuration
    const files = fs
        .readdirSync(contributesDir)
        .filter(file => file.endsWith('.json') && file !== 'configuration.json');

    for (const file of files.sort()) {
        const filePath = path.join(contributesDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (content.contributes) {
            Object.assign(contributes, content.contributes);
            console.log(`   ${file}`);
        }
    }

    // Генерируем configuration из config.js
    const configContribute = generateConfigurationContribute();
    Object.assign(contributes, configContribute.contributes);

    console.log(`   configuration (сгенерировано из config.js)`);

    const finalManifest = {
        ...originalPackage,
        contributes: contributes,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(finalManifest, null, 4));

    console.log('\nManifest успешно собран!');
    console.log(`   Секций в contributes: ${Object.keys(contributes).length}`);
    console.log(`   Команд: ${contributes.commands ? contributes.commands.length : 0}`);
} catch (error) {
    let msg = error instanceof Error ? error.message : String(error);
    console.error(`Ошибка генерации манифеста: \n ${msg}`);
    process.exit(1);
}
