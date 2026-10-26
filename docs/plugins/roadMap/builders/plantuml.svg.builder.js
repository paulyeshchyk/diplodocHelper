// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function getPlantUmlImagePath(outputDir, lang) {
    const svgFileName = `gantt_${lang}.svg`;
    const imagesDir = path.join(outputDir, 'images');
    const svgAbsolutePath = path.join(imagesDir, svgFileName);

    return {
        svgFileName,
        imagesDir,
        svgAbsolutePath,
    };
}

function getPlantUmlCommand(tempPumlPath, targetDir) {
    if (process.env.PLANTUML_JAR_PATH && fs.existsSync(process.env.PLANTUML_JAR_PATH)) {
        return `java -jar "${process.env.PLANTUML_JAR_PATH}" -charset UTF-8 -tsvg -o "${targetDir}" "${tempPumlPath}"`;
    }

    const projectRelativeJar = path.resolve(__dirname, '../../../docs/_assets/jar/plantuml.jar');

    if (fs.existsSync(projectRelativeJar)) {
        return `java -jar "${projectRelativeJar}" -charset UTF-8 -tsvg -o "${targetDir}" "${tempPumlPath}"`;
    }

    return `plantuml -charset UTF-8 -tsvg -o "${targetDir}" "${tempPumlPath}"`;
}

function renderPlantUmlToSvg(script, outputPath) {
    return new Promise((resolve, reject) => {
        const dataPath = path.resolve(outputPath);
        const targetDir = path.dirname(dataPath);
        const fileName = path.basename(dataPath);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const tempPumlPath = path.join(targetDir, fileName.replace(/\.svg$/, '.puml'));
        fs.writeFileSync(tempPumlPath, script, 'utf-8');

        const command = getPlantUmlCommand(tempPumlPath, targetDir);

        exec(command, (error, stdout, stderr) => {
            if (fs.existsSync(tempPumlPath)) {
                try {
                    fs.unlinkSync(tempPumlPath);
                } catch (e) {
                    console.error('❌ [PlantUML Unlink Error]:', stderr || error.message);
                }
            }

            if (error) {
                console.error('❌ [PlantUML Fatal Error]:', stderr || error.message);
                return reject(error);
            }

            if (!fs.existsSync(dataPath)) {
                return reject(new Error(`❌ [PlantUML] SVG файл не был создан по пути: ${dataPath}`));
            }

            resolve(dataPath);
        });
    });
}

async function buildPlantUmlSvg(script, outputDir, lang) {
    const { svgAbsolutePath } = getPlantUmlImagePath(outputDir, lang);
    const renderPath = await renderPlantUmlToSvg(script, svgAbsolutePath);
    let svgContent = fs.readFileSync(renderPath, 'utf-8');

    svgContent = svgContent.replace(/<\?xml[\s\S]*?\?>/i, '').trim();

    return {
        svgContent,
        legend: '',
    };
}

module.exports = {
    getPlantUmlImagePath,
    buildPlantUmlSvg,
};
