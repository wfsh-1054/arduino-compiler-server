import express, { Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https'; // 🟢 1. 引入 Node.js 內建的 HTTPS 模組


const app = express();
app.use(express.json());
// ==================================================
// 隔離環境設定：強迫 arduino-cli 將所有檔案裝在專案資料夾內
// ==================================================
// 判斷是否在 Electron ASAR 打包環境中
const isAsar = __dirname.includes('app.asar');

// 資料夾必須放在可寫入的地方 (Electron 傳入 userData 或是預設目錄)
const ARDUINO_DATA_DIR = process.env.ARDUINO_DATA_DIR || path.join(__dirname, '..', '.arduino-data');
const ARDUINO_USER_DIR = path.join(ARDUINO_DATA_DIR, 'user');

fs.mkdirSync(ARDUINO_DATA_DIR, { recursive: true });
fs.mkdirSync(ARDUINO_USER_DIR, { recursive: true });

function getCliPath() {
    // 執行檔必須從 app.asar.unpacked 中讀取，因為 OS 無法執行 asar 內的二進位檔
    const baseDir = isAsar ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname;
    const binDir = path.join(baseDir, '..', 'bin');
    return path.join(binDir, process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli');
}

// 封裝執行 arduino-cli 的函式，自動帶入隔離的環境變數
function execArduinoCli(args: string, callback: (error: any, stdout: string, stderr: string) => void) {
    const cliPath = getCliPath();
    const cmd = `"${cliPath}" ${args}`;
    const env = {
        ...process.env,
        ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR,
        ARDUINO_DATA_DIR,
        ARDUINO_USER_DIR
    };
    exec(cmd, { env }, callback);
}

interface CompileRequestBody {
    code: string;
    boardType: 'uno' | 'esp32';
}

// 核心編譯 API 路由
app.post('/api/compile', (req: Request<{}, {}, CompileRequestBody>, res: Response) => {
    const { code, boardType } = req.body;
    if (!code) return res.status(400).json({ success: false, error: "請提供 code 欄位" });

    const buildId = Date.now();
    // 使用環境變數或預設路徑
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
        
        execArduinoCli(compileArgs, (error, stdout, stderr) => {
            if (error) {
                fs.rmSync(sketchDir, { recursive: true, force: true });
                return res.status(400).json({ success: false, error: stderr || stdout });
            }

            const targetFile = path.join(outputDir, `workspace_${buildId}.ino.${ext}`);
            if (fs.existsSync(targetFile)) {
                const fileBuffer = fs.readFileSync(targetFile);
                fs.rmSync(sketchDir, { recursive: true, force: true });
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename=firmware.${ext}`);
                return res.send(fileBuffer);
            } else {
                return res.status(500).json({ success: false, error: "找不到編譯出來的檔案" });
            }
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// ==================================================
// 系統初始化 (System Init) - Streaming API (SSE)
// ==================================================
app.get('/api/system/init', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const cliPath = getCliPath();
    const env = { ...process.env, ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR, ARDUINO_DATA_DIR, ARDUINO_USER_DIR };

    res.write(`data: ⏳ 開始更新核心庫索引...\n\n`);
    
    const proc1 = spawn(cliPath, ['core', 'update-index'], { env });
    proc1.stdout.on('data', d => { const s = d.toString().trim(); if(s) res.write(`data: ${s}\n\n`); });
    proc1.stderr.on('data', d => { const s = d.toString().trim(); if(s) res.write(`data: [ERR] ${s}\n\n`); });
    
    proc1.on('close', (code) => {
        if (code !== 0) {
            res.write(`data: [ERR] 更新失敗 (Code: ${code})\n\n`);
            res.write(`data: [DONE]\n\n`);
            return res.end();
        }
        res.write(`data: ✅ 索引更新完成！\n\n`);
        res.write(`data: ⏳ 開始安裝 arduino:avr 開發板核心...\n\n`);
        
        const proc2 = spawn(cliPath, ['core', 'install', 'arduino:avr'], { env });
        proc2.stdout.on('data', d => {
            const lines = d.toString().split('\n');
            for(let line of lines) {
                line = line.trim();
                if(line) res.write(`data: ${line}\n\n`);
            }
        });
        proc2.stderr.on('data', d => { const s = d.toString().trim(); if(s) res.write(`data: [ERR] ${s}\n\n`); });
        
        proc2.on('close', (code2) => {
            if (code2 !== 0) {
                res.write(`data: [ERR] 安裝失敗 (Code: ${code2})\n\n`);
            } else {
                res.write(`data: 🎉 arduino:avr 安裝完成！可以開始開發了！\n\n`);
            }
            res.write(`data: [DONE]\n\n`);
            res.end();
        });
    });
});

// ==================================================
// 開發板管理 (Board Management) APIs
// ==================================================
app.get('/api/boards/installed', (req: Request, res: Response) => {
    execArduinoCli(`core list --format json`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ success: false, error: stderr || stdout });
        try {
            const data = JSON.parse(stdout);
            return res.json({ success: true, data: data });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: "解析 JSON 失敗" });
        }
    });
});

app.post('/api/boards/install', (req: Request, res: Response) => {
    const { core } = req.body;
    if (!core) return res.status(400).json({ success: false, error: "請提供 core 參數 (例: esp32:esp32)" });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const cliPath = getCliPath();
    const env = { ...process.env, ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR, ARDUINO_DATA_DIR, ARDUINO_USER_DIR };
    const additionalUrls = `--additional-urls "https://espressif.github.io/arduino-esp32/package_esp32_index.json"`;
    
    res.write(`data: ⏳ 更新索引清單中...\n\n`);
    
    const proc1 = spawn(cliPath, ['core', 'update-index', '--additional-urls', 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'], { env });
    proc1.on('close', (code) => {
        res.write(`data: ⏳ 開始下載與安裝 ${core}...\n\n`);
        
        const proc2 = spawn(cliPath, ['core', 'install', core, '--additional-urls', 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'], { env });
        proc2.stdout.on('data', d => {
            const lines = d.toString().split('\n');
            for(let line of lines) {
                line = line.trim();
                if(line) res.write(`data: ${line}\n\n`);
            }
        });
        proc2.stderr.on('data', d => { const s = d.toString().trim(); if(s) res.write(`data: [ERR] ${s}\n\n`); });
        
        proc2.on('close', (code2) => {
            if (code2 !== 0) {
                res.write(`data: [ERR] 安裝失敗 (Code: ${code2})\n\n`);
            } else {
                res.write(`data: 🎉 ${core} 安裝完成！\n\n`);
            }
            res.write(`data: [DONE]\n\n`);
            res.end();
        });
    });
});

// ==================================================
// 函式庫管理 (Library Management) APIs
// ==================================================
app.get('/api/libraries/installed', (req: Request, res: Response) => {
    execArduinoCli(`lib list --format json`, (error, stdout, stderr) => {
        if (error && !stdout) return res.status(500).json({ success: false, error: stderr });
        try {
            const data = stdout ? JSON.parse(stdout) : [];
            return res.json({ success: true, data: data });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: "解析 JSON 失敗: " + stdout });
        }
    });
});

app.post('/api/libraries/install', (req: Request, res: Response) => {
    const { libName } = req.body;
    if (!libName) return res.status(400).json({ success: false, error: "請提供 libName 參數" });
    
    execArduinoCli(`lib install "${libName}"`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ success: false, error: stderr || stdout });
        return res.json({ success: true, message: stdout });
    });
});

// ==================================================

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

if (fs.existsSync(frontendDist)) {
    console.log(`Serving static files from React dist: ${frontendDist}`);
    app.use(express.static(frontendDist));
} else {
    console.log(`Serving static files from legacy public dir: ${publicDir}`);
    app.use(express.static(publicDir));
}

// ==================================================
// 🔐 伺服器啟動設定 (支援 HTTPS 與 HTTP 回退機制)
// ==================================================
const PORT = 3000;

console.log(`\n==================================================`);
    // 使用環境變數或預設的 HTTPS 憑證路徑
    const keyPath = process.env.SERVER_KEY_PATH || path.join(__dirname, '..', 'server.key');
    const certPath = process.env.SERVER_CERT_PATH || path.join(__dirname, '..', 'server.crt');
    const isHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);

    if (isHttps) {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    https.createServer(httpsOptions, app).listen(PORT, '127.0.0.1', () => {
        console.log(`🔒 安全加密 (HTTPS) 伺服器成功啟動！`);
        console.log(`💻 本地測試網址：https://127.0.0.1:${PORT}`);
        console.log(`⚠️ 已限制僅允許本機連線 (127.0.0.1)，確保安全性。`);
        console.log(`==================================================\n`);
    });
} else {
    // 引入原生的 http 模組來啟動無加密伺服器
    const http = require('http');
    http.createServer(app).listen(PORT, '127.0.0.1', () => {
        console.log(`🔓 一般連線 (HTTP) 伺服器成功啟動！`);
        console.log(`💻 本地測試網址：http://127.0.0.1:${PORT}`);
        console.log(`⚠️ 已限制僅允許本機連線 (127.0.0.1)，確保安全性。`);
        console.log(`==================================================\n`);
    });
}