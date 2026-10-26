// @ts-nocheck
// plugins/roadMap/builders/plantuml.builder.js

const { execSync } = require('child_process');

const { generatePlantUmlScript } = require('./plantuml.script.builder');
const { buildPlantUmlSvg, getPlantUmlImagePath } = require('./plantuml.svg.builder');

const { wrapSvgContainer } = require('./controls.builder');

function checkEnvironment() {
    if (process.env.PLANTUML_JAR_PATH) {
        return true;
    }

    try {
        execSync('java -version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        try {
            execSync('plantuml -version', { stdio: 'ignore' });
            return true;
        } catch (err) {
            console.error('\n❌ [PlantUML Builder Error]: В текущей среде окружения не найдены Java JRE или утилита plantuml.\n');
            return false;
        }
    }
}

async function buildPlantUml(data, lang, outputDir, roadmapCss) {
    const isEnvReady = checkEnvironment();
    if (!isEnvReady) {
        console.warn(`[${lang}] Пропуск генерации PlantUML: окружение не готово.`);
        return '*Ошибка сборки диаграммы: Java / PlantUML недоступны в системе.*';
    }

    try {
        const script = generatePlantUmlScript(data, lang);
        const { svgContent, legend } = await buildPlantUmlSvg(script, outputDir, lang);

        return wrapSvgContainer(svgContent, {
            cssContent: roadmapCss,
            legend: legend,
        });
    } catch (error) {
        console.error(`❌ [${lang}] Сбой генерации PlantUML диаграммы:`, error.message);
        return '*Не удалось сгенерировать диаграмму PlantUML.*';
    }
}

module.exports = {
    buildPlantUml,
    getPlantUmlImagePath,
};
