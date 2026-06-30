import path from 'path';
import fs from 'fs';

// ==================================================
// 隔離環境設定：強迫 arduino-cli 將所有檔案裝在專案資料夾內
// ==================================================
export const isAsar = __dirname.includes('app.asar');

export function getArduinoDataDir(): string {
    if (process.env.ARDUINO_DATA_DIR) {
        if (!fs.existsSync(process.env.ARDUINO_DATA_DIR)) fs.mkdirSync(process.env.ARDUINO_DATA_DIR, { recursive: true });
        return process.env.ARDUINO_DATA_DIR;
    }

    let defaultDataDir = path.join(__dirname, '..', '..', '.arduino-data');

    // 若在 Electron 環境中執行 (無論是開發期或打包後)，改存放到系統標準的 AppData / Application Support 目錄
    if (process.versions && process.versions.electron) {
        try {
            const { app } = require('electron');
            if (app && app.isReady()) {
                defaultDataDir = path.join(app.getPath('userData'), '.arduino-data');
            }
        } catch (e) {
            console.warn('Failed to get Electron userData path, falling back to local directory.');
        }
    }

    if (!fs.existsSync(defaultDataDir)) fs.mkdirSync(defaultDataDir, { recursive: true });
    return defaultDataDir;
}

export function getArduinoUserDir(): string {
    const dataDir = getArduinoDataDir();
    const userDir = path.join(dataDir, 'user');
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    return userDir;
}

export function getCliPath() {
    const baseDir = isAsar ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname;
    // __dirname is src/config
    const binDir = path.join(baseDir, '..', '..', 'bin');
    return path.join(binDir, process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli');
}
