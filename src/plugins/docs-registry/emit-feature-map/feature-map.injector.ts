import * as fs from 'node:fs';
import * as path from 'node:path';
import { Fs_Walk_Directory } from '../../utils/fs/Fs_Walk_Directory.ts';
import { Html_Classify_File } from '../../utils/html/Html_Classify_File.ts';

const STYLE_MARKER  = 'dl-feature-map-style';
const CLIENT_MARKER = 'dl-feature-map-client';

export interface RunGenerationOptions {
    /** Абсолютный путь к папке с `feature-map.css` и `feature-map.client.js`. */
    pluginDir: string;
}

export interface RunGenerationResult {
    success: string[];
    failed: string[];
}

/**
 * Инжектит `<style>` и `<script>` в HTML-страницы сборки,
 * содержащие маркер `data-feature-map`.
 *
 * Ассеты читаются из `opts.pluginDir` (в ESM нет `__dirname`;
 * вызывающая сторона передаёт путь явно).
 */
export function runGeneration(
    buildDir: string,
    opts: RunGenerationOptions,
): RunGenerationResult {
    if (!fs.existsSync(buildDir)) {
        console.error(`❌ [feature-map] build dir not found: ${buildDir}`);
        return { success: [], failed: [buildDir] };
    }

    const css = fs.readFileSync(path.join(opts.pluginDir, 'feature-map.css'), 'utf8');
    const js  = fs.readFileSync(path.join(opts.pluginDir, 'feature-map.client.js'), 'utf8');

    const styleTag  = `<style id="${STYLE_MARKER}">\n${css}\n</style>\n`;
    const clientTag = `<script id="${CLIENT_MARKER}">\n${js}\n</script>\n`;

    const results: RunGenerationResult = { success: [], failed: [] };

    Fs_Walk_Directory.walkSync({
        dir: buildDir,
        skipHidden: false,
        filterFile: Html_Classify_File.isHtmlFile,
        onFile: (htmlPath) => {
            try {
                let html = fs.readFileSync(htmlPath, 'utf8');
                if (!html.includes('data-feature-map')) return;

                const before = html;
                if (!html.includes(`id="${STYLE_MARKER}"`)) {
                    html = html.replace('</head>', styleTag + '</head>');
                }
                if (!html.includes(`id="${CLIENT_MARKER}"`)) {
                    html = html.replace('</body>', clientTag + '</body>');
                }
                if (html !== before) {
                    fs.writeFileSync(htmlPath, html, 'utf8');
                    results.success.push(htmlPath);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`❌ [feature-map] ${htmlPath}: ${msg}`);
                results.failed.push(htmlPath);
            }
        },
    });

    console.log(
        `[feature-map] CSS+JS инжектированы в ${results.success.length} HTML, ошибок: ${results.failed.length}`,
    );
    return results;
}