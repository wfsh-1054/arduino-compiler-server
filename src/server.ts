import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json()); // 讓伺服器看得懂前端傳來的 JSON 資料

// 1. 定義接收資料的規格
interface CompileRequestBody {
    code: string;
    boardType: 'uno' | 'esp32';
}

// 2. 實作編譯 API
app.post('/api/compile', (req: Request<{}, {}, CompileRequestBody>, res: Response) => {
    const { code, boardType } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, error: "請提供 code 欄位" });
    }

    // 建立一個唯一的 ID，避免多個編譯任務互相衝突
    const buildId = Date.now();

    // 設定臨時工作目錄（我們在專案根目錄下建立臨時資料夾）
    const sketchDir = path.join(__dirname, '..', `workspace_${buildId}`);
    const inoPath = path.join(sketchDir, `workspace_${buildId}.ino`);
    const outputDir = path.join(sketchDir, 'build');

    // 根據選擇的開發板，設定對應的 FQBN 與副檔名
    let fqbn = 'arduino:avr:uno';
    let ext = 'hex';
    if (boardType === 'esp32') {
        fqbn = 'esp32:esp32:esp32';
        ext = 'bin';
    }

    try {
        // 步驟 A: 建立資料夾並將程式碼寫入實體 .ino 檔案
        fs.mkdirSync(sketchDir, { recursive: true });
        fs.writeFileSync(inoPath, code);

        // 🟢 智慧環境偵測：根據作業系統平台自動切換 arduino-cli 路徑
        let cliPath = 'arduino-cli'; // 預設值（適用於 Docker Linux 或已設定環境變數的系統）

        if (process.platform === 'win32') {
            // 🪟 如果偵測到是 Windows 本地開發環境，自動導向你的實體路徑
            cliPath = `C:\\arduino-tools\\bin\\arduino-cli.exe`;
            console.log("💻 偵測到 Windows 環境，啟用本地開發路徑。");
        } else {
            // 🐳 如果是 Linux (Docker)，則直接使用全域指令
            console.log("🐳 偵測到 Linux/Docker 環境，啟用全域容器路徑。");
        }

        // 組合編譯指令
        const compileCmd = `"${cliPath}" compile --fqbn ${fqbn} --output-dir "${outputDir}" "${sketchDir}"`;
        console.log(`正在執行指令: ${compileCmd}`);

        // 步驟 C: 呼叫作業系統執行該指令
        exec(compileCmd, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ 編譯失敗");
                // 發生錯誤時，記得把垃圾資料夾刪掉
                fs.rmSync(sketchDir, { recursive: true, force: true });
                return res.status(400).json({ success: false, error: stderr || stdout });
            }

            // 步驟 D: 檢查編譯產物是否存在
            // 加上 .ino，與 arduino-cli 實際產出的檔名保持一致
            const targetFile = path.join(outputDir, `workspace_${buildId}.ino.${ext}`);
            if (fs.existsSync(targetFile)) {
                console.log("🎯 編譯成功，正在讀取檔案...");
                const fileBuffer = fs.readFileSync(targetFile);

                // 清理臨時資料夾
                fs.rmSync(sketchDir, { recursive: true, force: true });

                // 將二進位檔案倒回給客戶端
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

// 補上這一段：當瀏覽器造訪 http://localhost:3000/ 時，主動送出 index.html
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});