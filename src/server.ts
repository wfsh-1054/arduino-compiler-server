import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https'; // 🟢 1. 引入 Node.js 內建的 HTTPS 模組
import { compileCode, initSystem, getInstalledBoards, installBoard, getInstalledLibraries, installLibrary } from './arduinoService';

const app = express();
app.use(express.json());

interface CompileRequestBody {
    code: string;
    boardType: 'uno' | 'esp32';
}

// 核心編譯 API 路由
app.post('/api/compile', async (req: Request<{}, {}, CompileRequestBody>, res: Response) => {
    const { code, boardType } = req.body;
    const result = await compileCode(code, boardType);
    
    if (result.success && result.fileBuffer) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=firmware.${result.ext}`);
        return res.send(result.fileBuffer);
    } else {
        return res.status(500).json({ success: false, error: result.error });
    }
});

// ==================================================
// 系統初始化 (System Init) - Streaming API (SSE)
// ==================================================
app.get('/api/system/init', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        await initSystem((msg) => res.write(`data: ${msg}\n\n`));
        res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
        res.write(`data: [ERR] ${err.message}\n\n`);
        res.write(`data: [DONE]\n\n`);
    }
    res.end();
});

// ==================================================
// 開發板管理 (Board Management) APIs
// ==================================================
app.get('/api/boards/installed', async (req: Request, res: Response) => {
    try {
        const data = await getInstalledBoards();
        return res.json({ success: true, data: data });
    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/boards/install', async (req: Request, res: Response) => {
    const { core } = req.body;
    if (!core) return res.status(400).json({ success: false, error: "請提供 core 參數 (例: esp32:esp32)" });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        await installBoard(core, (msg) => res.write(`data: ${msg}\n\n`));
        res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
        res.write(`data: [ERR] ${err.message}\n\n`);
        res.write(`data: [DONE]\n\n`);
    }
    res.end();
});

// ==================================================
// 函式庫管理 (Library Management) APIs
// ==================================================
app.get('/api/libraries/installed', async (req: Request, res: Response) => {
    try {
        const data = await getInstalledLibraries();
        return res.json({ success: true, data: data });
    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/libraries/install', async (req: Request, res: Response) => {
    const { libName } = req.body;
    if (!libName) return res.status(400).json({ success: false, error: "請提供 libName 參數" });
    
    try {
        const message = await installLibrary(libName);
        return res.json({ success: true, message });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
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