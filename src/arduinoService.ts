import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// ==================================================
// 隔離環境設定：強迫 arduino-cli 將所有檔案裝在專案資料夾內
// ==================================================
const isAsar = __dirname.includes('app.asar');
const ARDUINO_DATA_DIR = process.env.ARDUINO_DATA_DIR || path.join(__dirname, '..', '.arduino-data');
const ARDUINO_USER_DIR = path.join(ARDUINO_DATA_DIR, 'user');

if (!fs.existsSync(ARDUINO_DATA_DIR)) fs.mkdirSync(ARDUINO_DATA_DIR, { recursive: true });
if (!fs.existsSync(ARDUINO_USER_DIR)) fs.mkdirSync(ARDUINO_USER_DIR, { recursive: true });

function getCliPath() {
    const baseDir = isAsar ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname;
    const binDir = path.join(baseDir, '..', 'bin');
    return path.join(binDir, process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli');
}

function execArduinoCli(args: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        const cliPath = getCliPath();
        const cmd = `"${cliPath}" ${args}`;
        const env = {
            ...process.env,
            ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR,
            ARDUINO_DATA_DIR,
            ARDUINO_USER_DIR
        };
        exec(cmd, { env }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || stdout || error.message));
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// 用於長時間執行的任務 (回傳進度)
function spawnArduinoCli(args: string[], onData: (data: string) => void, onDone: (code: number) => void) {
    const cliPath = getCliPath();
    const env = { ...process.env, ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR, ARDUINO_DATA_DIR, ARDUINO_USER_DIR };
    const proc = spawn(cliPath, args, { env });

    proc.stdout.on('data', d => {
        const lines = d.toString().split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line) onData(line);
        }
    });

    proc.stderr.on('data', d => {
        const s = d.toString().trim();
        if (s) onData(`[ERR] ${s}`);
    });

    proc.on('close', code => {
        if (code !== null) onDone(code);
    });
}

// ==================================================
// Service APIs
// ==================================================

export async function compileCode(code: string, boardType: 'uno' | 'esp32'): Promise<{ success: boolean, fileBuffer?: Buffer, error?: string, ext?: string }> {
    if (!code) return { success: false, error: "請提供 code 欄位" };

    const buildId = Date.now();
    const workspaceRoot = process.env.WORKSPACE_DIR || path.join(__dirname, '..', 'tmp_workspace');
    const sketchDir = path.join(workspaceRoot, `workspace_${buildId}`);
    const inoPath = path.join(sketchDir, `workspace_${buildId}.ino`);
    const outputDir = path.join(sketchDir, 'build');

    let fqbn = 'arduino:avr:uno';
    let ext = 'hex';
    if (boardType === 'esp32') {
        fqbn = 'esp32:esp32:esp32';
        ext = 'bin';
    }

    try {
        fs.mkdirSync(sketchDir, { recursive: true });
        fs.writeFileSync(inoPath, code);

        const compileArgs = `compile --fqbn ${fqbn} --output-dir "${outputDir}" "${sketchDir}"`;
        await execArduinoCli(compileArgs);

        const targetFile = path.join(outputDir, `workspace_${buildId}.ino.${ext}`);
        if (fs.existsSync(targetFile)) {
            const fileBuffer = fs.readFileSync(targetFile);
            fs.rmSync(sketchDir, { recursive: true, force: true });
            return { success: true, fileBuffer, ext };
        } else {
            fs.rmSync(sketchDir, { recursive: true, force: true });
            return { success: false, error: "找不到編譯出來的檔案" };
        }
    } catch (err: any) {
        if (fs.existsSync(sketchDir)) {
            fs.rmSync(sketchDir, { recursive: true, force: true });
        }
        return { success: false, error: err.message };
    }
}
export async function uploadCode(fileBuffer: Buffer, boardType: 'uno' | 'esp32', portName: string, ext: string): Promise<{ success: boolean, error?: string }> {
    const buildId = Date.now();
    const workspaceRoot = process.env.WORKSPACE_DIR || path.join(__dirname, '..', 'tmp_workspace');
    const uploadDir = path.join(workspaceRoot, `upload_${buildId}`);
    const binFile = path.join(uploadDir, `firmware.${ext}`);

    let fqbn = 'arduino:avr:uno';
    if (boardType === 'esp32') {
        fqbn = 'esp32:esp32:esp32';
    }

    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(binFile, fileBuffer);

        const uploadArgs = `upload -p "${portName}" --fqbn ${fqbn} --input-file "${binFile}"`;
        await execArduinoCli(uploadArgs);

        fs.rmSync(uploadDir, { recursive: true, force: true });
        return { success: true };
    } catch (err: any) {
        if (fs.existsSync(uploadDir)) {
            fs.rmSync(uploadDir, { recursive: true, force: true });
        }
        return { success: false, error: err.message };
    }
}
export function initSystem(onProgress: (msg: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        onProgress(`⏳ 開始更新核心庫索引...`);
        spawnArduinoCli(['core', 'update-index'], (data) => {
            onProgress(data);
        }, (code1) => {
            if (code1 !== 0) {
                onProgress(`[ERR] 更新失敗 (Code: ${code1})`);
                return reject(new Error(`Update index failed with code ${code1}`));
            }
            onProgress(`✅ 索引更新完成！`);
            onProgress(`⏳ 開始安裝 arduino:avr 開發板核心...`);
            
            spawnArduinoCli(['core', 'install', 'arduino:avr'], (data) => {
                onProgress(data);
            }, (code2) => {
                if (code2 !== 0) {
                    onProgress(`[ERR] 安裝失敗 (Code: ${code2})`);
                    return reject(new Error(`Install core failed with code ${code2}`));
                }
                onProgress(`🎉 arduino:avr 安裝完成！可以開始開發了！`);
                resolve();
            });
        });
    });
}

export async function getInstalledBoards(): Promise<any> {
    try {
        const { stdout } = await execArduinoCli(`core list --format json`);
        return JSON.parse(stdout);
    } catch (err: any) {
        throw new Error(err.message);
    }
}

export function installBoard(core: string, onProgress: (msg: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        onProgress(`⏳ 更新索引清單中...`);
        spawnArduinoCli(['core', 'update-index', '--additional-urls', 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'], (data) => {
             // 忽略部份輸出
        }, (code1) => {
            onProgress(`⏳ 開始下載與安裝 ${core}...`);
            spawnArduinoCli(['core', 'install', core, '--additional-urls', 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'], (data) => {
                onProgress(data);
            }, (code2) => {
                if (code2 !== 0) {
                    onProgress(`[ERR] 安裝失敗 (Code: ${code2})`);
                    return reject(new Error(`Install failed with code ${code2}`));
                }
                onProgress(`🎉 ${core} 安裝完成！`);
                resolve();
            });
        });
    });
}

export async function getInstalledLibraries(): Promise<any> {
    try {
        const { stdout } = await execArduinoCli(`lib list --format json`);
        return stdout ? JSON.parse(stdout) : [];
    } catch (err: any) {
        throw new Error(err.message);
    }
}

export async function installLibrary(libName: string): Promise<string> {
    const { stdout } = await execArduinoCli(`lib install "${libName}"`);
    return stdout;
}
