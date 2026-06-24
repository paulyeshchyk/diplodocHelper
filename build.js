const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

const buildOptions = {
    entryPoints: ['src/extension.js'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node16',
    logLevel: 'info',

    sourcemap: !isProduction,
    sourcesContent: !isProduction,
    minify: isProduction,
    treeShaking: true,
};

async function build() {
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
    }

    try {
        if (isWatch) {
            // @ts-ignore
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log('Watch mode (development with sourcemaps) started...');
        } else {
            // @ts-ignore
            await esbuild.build(buildOptions);
            const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
            console.log(`Build completed (${mode})`);
            const size = (fs.statSync('dist/extension.js').size / 1024).toFixed(2);
            console.log(`Size: ${size} KB`);
        }
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
}

build();
