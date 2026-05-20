const fs = require('fs');
const path = require('path');

function injectCleanMode(buildDir) {
    const files = [];
    function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(file => {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) walk(fullPath);
            else if (file.name.endsWith('.html')) files.push(fullPath);
        });
    }
    walk(buildDir);

    const cleanScript = fs.readFileSync(path.join(__dirname, './inject-clean-mode.js'), 'utf8');

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');

        // Вставляем перед </body>
        if (content.includes('</body>')) {
            content = content.replace('</body>', `<script>${cleanScript}</script>\n</body>`);
            fs.writeFileSync(file, content);
            console.log(`Injected clean-mode into: ${file}`);
        }
    });
}

module.exports = { injectCleanMode };