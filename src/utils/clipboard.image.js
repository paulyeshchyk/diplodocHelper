/* eslint-disable prettier/prettier */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/** 
 * @typedef {Object} ShellScript 
 * @property {string} script
 * @property {string[]} args
*/

/**
 * Читает изображение из буфера обмена и сохраняет во временный файл.
 * Возвращает Buffer с данными изображения или null, если картинки в буфере нет.
 * * @returns {Promise<Buffer|null>}
 */
async function getImageFromClipboard() {
    const platform = os.platform();
    const tempPath = path.join(os.tmpdir(), `vscode_clip_${Date.now()}.png`);

    return new Promise((resolve) => {

        /** @type {ShellScript | null} */
        let shellScript = GetShellScript();
        if (shellScript === null) {
            resolve(null);
            return;
        }

        cp.execFile(shellScript.script, shellScript.args, (error) => {
            if (error) {
                // Если произошла ошибка (или в буфере просто не было картинки)
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                resolve(null);
                return;
            }

            try {
                if (fs.existsSync(tempPath)) {
                    const buffer = fs.readFileSync(tempPath);
                    fs.unlinkSync(tempPath); // Удаляем временный файл
                    resolve(buffer); // Возвращаем Buffer (бинарные данные PNG)
                } else {
                    resolve(null);
                }
            } catch (e) {
                console.error('Ошибка при чтении временного файла картинки:', e);
                resolve(null);
            }
        });
    });

    /**
     * @returns { ShellScript | null}
     */
    function GetShellScript() {
        if (platform === 'win32') {
            return GetImagePowerShell();
        } else if (platform === 'darwin') {
            return GetImageDarwin();
        } else if (platform === 'linux') {
            return GetImageLinux();
        } else {
            return null;
        }
    }

    /**
     * @returns { ShellScript | null}
     */
    function GetImageLinux() {
        // Для Linux требуется утилита xclip
        let script = 'xclip';
        let args = ['-selection', 'clipboard', '-t', 'image/png', '-o', '>', tempPath];
        return { script, args };
    }

    /**
     * @returns { ShellScript | null}
     */
    function GetImageDarwin() {
        // Для macOS используем встроенный AppleScript (osascript)
        let script = 'osascript';
        let args = ['-e', `write (the clipboard as «class PNGf») to (open for access POSIX file "${tempPath}" with write permission)`];
        return { script, args };
    }

    /**
     * @returns { ShellScript | null}
     */
    function GetImagePowerShell() {
        // Используем PowerShell для извлечения картинки и сохранения в файл
        let script = 'powershell';
        let args = [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `
                Add-Type -AssemblyName System.Windows.Forms;
                if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
                    $image = [System.Windows.Forms.Clipboard]::GetImage();
                    $image.Save("${tempPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png);
                    $image.Dispose();
                    exit 0;
                } else {
                    exit 1;
                }
                `
        ];
        return { script, args };
    }
}

module.exports = { getImageFromClipboard }