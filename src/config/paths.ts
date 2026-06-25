import path from 'path';
import fs from 'fs';

// ==================================================
// 隔離環境設定：強迫 arduino-cli 將所有檔案裝在專案資料夾內
// ==================================================
export const isAsar = __dirname.includes('app.asar');
export const ARDUINO_DATA_DIR = process.env.ARDUINO_DATA_DIR || path.join(__dirname, '..', '..', '.arduino-data');
export const ARDUINO_USER_DIR = path.join(ARDUINO_DATA_DIR, 'user');

// 確保目錄存在
if (!fs.existsSync(ARDUINO_DATA_DIR)) fs.mkdirSync(ARDUINO_DATA_DIR, { recursive: true });
if (!fs.existsSync(ARDUINO_USER_DIR)) fs.mkdirSync(ARDUINO_USER_DIR, { recursive: true });

export function getCliPath() {
    const baseDir = isAsar ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname;
    // __dirname is src/config
    const binDir = path.join(baseDir, '..', '..', 'bin');
    return path.join(binDir, process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli');
}
