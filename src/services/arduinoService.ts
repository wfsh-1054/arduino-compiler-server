import fs from 'fs';
import path from 'path';
import { execArduinoCli, spawnArduinoCli } from './cliRunner';

// ==================================================
// Service APIs
// ==================================================

export async function compileCode(code: string, boardType: string): Promise<{ success: boolean, fileBuffer?: Buffer, error?: string, ext?: string }> {
    if (!code) return { success: false, error: "請提供 code 欄位" };

    const buildId = Date.now();
    const workspaceRoot = process.env.WORKSPACE_DIR || path.join(__dirname, '..', '..', 'tmp_workspace');
    const sketchDir = path.join(workspaceRoot, `workspace_${buildId}`);
    const inoPath = path.join(sketchDir, `workspace_${buildId}.ino`);
    const outputDir = path.join(sketchDir, 'build');

    let fqbn = 'arduino:avr:uno';
    let ext = 'hex';
    if (boardType === 'esp32') {
        fqbn = 'esp32:esp32:esp32';
        ext = 'bin';
    } else if (boardType === 'nano') {
        fqbn = 'arduino:avr:nano';
    } else if (boardType === 'nano_old') {
        fqbn = 'arduino:avr:nano:cpu=atmega328old';
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

export async function uploadCode(fileBuffer: Buffer, boardType: string, portName: string, ext: string): Promise<{ success: boolean, error?: string }> {
    const buildId = Date.now();
    const workspaceRoot = process.env.WORKSPACE_DIR || path.join(__dirname, '..', '..', 'tmp_workspace');
    const uploadDir = path.join(workspaceRoot, `upload_${buildId}`);
    const binFile = path.join(uploadDir, `firmware.${ext}`);

    let fqbn = 'arduino:avr:uno';
    if (boardType === 'esp32') {
        fqbn = 'esp32:esp32:esp32';
    } else if (boardType === 'nano') {
        fqbn = 'arduino:avr:nano';
    } else if (boardType === 'nano_old') {
        fqbn = 'arduino:avr:nano:cpu=atmega328old';
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
