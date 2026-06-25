import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';

import compileRoutes from './routes/compileRoutes';
import systemRoutes from './routes/systemRoutes';
import boardRoutes from './routes/boardRoutes';
import libraryRoutes from './routes/libraryRoutes';

const app = express();
app.use(express.json());

// ==================================================
// API Routes
// ==================================================
app.use('/api', compileRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/libraries', libraryRoutes);

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
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

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
    https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
        console.log(`🔒 安全加密 (HTTPS) 伺服器成功啟動！`);
        console.log(`💻 測試網址：https://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
        console.log(`🌐 監聽位址：${HOST}`);
        console.log(`==================================================\n`);
    });
} else {
    // 引入原生的 http 模組來啟動無加密伺服器
    const http = require('http');
    http.createServer(app).listen(PORT, HOST, () => {
        console.log(`🔓 一般連線 (HTTP) 伺服器成功啟動！`);
        console.log(`💻 測試網址：http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
        console.log(`🌐 監聽位址：${HOST}`);
        console.log(`==================================================\n`);
    });
}