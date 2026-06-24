const fs = require('fs');
const { buildContributes } = require('./contributionBuilder');
const { TsConfigParser } = require('../config/config.parser.tsconfig.js');
const { compileContribution } = require('./contributionCompiler');

// =======================

class ConfigData {
    /**
     * @param {string} typeDefName
     * @param {any} settingPrefix
     * @param {any} title
     */
    constructor(typeDefName, settingPrefix, title) {
        this.typeDefName = typeDefName;
        this.settingPrefix = settingPrefix;
        this.title = title;
    }
}

/**
 * @param {fs.PathOrFileDescriptor} packageJsonPath
 * @param {fs.PathOrFileDescriptor} configPath
 * @param {import('./contributionBuildRequest').ContributionBuildRequest} contributionData
 * @param {ConfigData} configData
 */
function contributionInject(packageJsonPath, configPath, contributionData, configData) {
    try {
        const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        console.log('Собираем contributes из классов...');

        const contributes = buildContributes(
            contributionData.rootMenus,
            contributionData.allSubmenus,
            contributionData.commands
        );

        // Генерируем configuration
        const tsParser = new TsConfigParser(configData.settingPrefix);
        const configContribute = compileContribution({
            modelPath: configPath.toString(),
            typeDefName: configData.typeDefName,
            settingPrefix: configData.settingPrefix,
            title: configData.title,
            parser: tsParser,
        });

        Object.assign(contributes, configContribute.contributes);

        const finalManifest = {
            ...originalPackage,
            contributes: contributes,
        };

        fs.writeFileSync(packageJsonPath, JSON.stringify(finalManifest, null, 4));

        console.log('\nManifest успешно собран!');
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Ошибка генерации манифеста: \n ${msg}`);
        process.exit(1);
    }
}

module.exports = { contributionInject, ConfigData };
