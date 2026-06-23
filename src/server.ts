import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https'; // 🟢 1. 引入 Node.js 內建的 HTTPS 模組
import Bonjour from 'bonjour-service'; // 🟢 2. 引入 mDNS 廣播套件

const app = express();
app.use(express.json());
app.use(express.static('public'));

interface CompileRequestBody {
    code: string;
    boardType: 'uno' | 'esp32';
}

// 核心編譯 API 路由
app.post('/api/compile', (req: Request<{}, {}, CompileRequestBody>, res: Response) => {
    const { code, boardType } = req.body;
    if (!code) return res.status(400).json({ success: false, error: "請提供 code 欄位" });

    const buildId = Date.now();
    const sketchDir = path.join(__dirname, '..', `workspace_${buildId}`);
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

        let cliPath = 'arduino-cli';
        if (process.platform === 'win32') {
            cliPath = `C:\\arduino-tools\\bin\\arduino-cli.exe`;
        }

        const compileCmd = `"${cliPath}" compile --fqbn ${fqbn} --output-dir "${outputDir}" "${sketchDir}"`;
        
        exec(compileCmd, (error, stdout, stderr) => {
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

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ==================================================
// 🔐 HTTPS 憑證讀取設定
// ==================================================
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'server.crt'))
};

const PORT = 3000;

// 🚀 啟動安全 HTTPS 伺服器
// 🎯 關鍵修正：補上 '0.0.0.0' 允許跨作業系統、跨裝置連線
https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`🔒 安全加密（HTTPS）區域網路服務成功啟動！`);
    console.log(`💻 本地測試網址：https://localhost:${PORT}`);
    
    // ==================================================
    // 🌐 智慧區域網路 mDNS 網域廣播
    // ==================================================
    try {
        const bonjour = new Bonjour();
        bonjour.publish({ 
            name: 'Arduino Cloud IDE Service',
            type: 'https',
            port: PORT,
            host: 'arduino-ide.local' // 🎯 註冊自訂區網網域
        });
        console.log(`🌐 區網網域已同步廣播：https://arduino-ide.local:${PORT}`);
    } catch (mdnsError) {
        console.log(`⚠️ mDNS 廣播啟動失敗，但 HTTPS 正常運行：`, mdnsError);
    }
    console.log(`==================================================\n`);
});