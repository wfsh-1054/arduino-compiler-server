# Maker IDE (Arduino 雲端編譯與輕量化桌面環境)

這是一個專為創客設計的輕量級 Arduino 開發環境。我們將「網頁前端介面」與「背景編譯伺服器」完美封裝成單一的 **Electron 桌面應用程式 (.exe)**。使用者可以在免安裝龐大官方 IDE 的情況下，輕鬆完成程式碼撰寫、雲端/本地編譯，並透過 Web Serial API 將韌體無縫燒錄至 Arduino 開發板中。

## 🌟 核心特色

- **極致輕量與免安裝 (Portable)**：應用程式本體僅約 100MB。不需繁瑣設定，點開即用。
- **首次啟動自動配置**：第一次開啟應用程式時，系統會在背景自動下載並安裝所有的 Arduino AVR 編譯核心。超過 800MB 的核心資料會被安全且安靜地存放在您的系統 `AppData` 目錄中，保持執行檔本身的輕巧。
- **一鍵秒連 COM Port**：透過深度整合 Web Serial API 與 Electron 底層，只要插上 Arduino 開發板並點擊「Select Serial Port」，系統就會自動捕捉並連線第一個可用的開發板，免去反覆挑選連接埠的麻煩。
- **無縫背景燒錄**：利用 `avrgirl-arduino`，編譯完成後自動在背景將韌體寫入晶片，完全自動化。
- **多平台彈性支援**：除了作為桌面應用程式執行外，依舊保留了作為純 Web 伺服器運作的能力（支援 Docker 與 Node.js 直接啟動）。

## 🏗️ 系統架構

本系統採用全端架構整合入 Electron：

### 1. 桌面封裝 (Electron Main Process)
- **檔案**：`main.js`
- **功能**：負責啟動應用程式視窗、攔截並自動授權 Web Serial API 的硬體存取請求，並設定將 Arduino 工具鏈的讀寫路徑指向使用者的 `AppData` 目錄，確保打包後的唯讀環境不會發生寫入衝突。

### 2. 前端介面 (React Frontend)
- **技術棧**：React, Vite, TypeScript, Web Serial API, `avrgirl-arduino`
- **功能**：提供現代化的程式碼編輯器介面。初次啟動時自動檢查編譯環境，並透過 Server-Sent Events (SSE) 即時顯示核心下載進度。撰寫完成後，呼叫後端 API 進行編譯，取得 `.hex` 檔後透過 Web Serial API 燒錄。

### 3. 編譯伺服器 (Express Backend)
- **檔案**：`src/server.ts`
- **功能**：在背景提供 `/api/compile` API。接收前端傳來的程式碼後，透過系統底層的 `arduino-cli` 在獨立的暫存資料夾中進行編譯，最後回傳二進位韌體檔。

## 🚀 快速開始

### 方式一：使用桌面應用程式 (最推薦)
1. 前往 GitHub Releases 頁面下載最新版的 `Maker-IDE-v1.0.0.zip`。
2. 解壓縮後，雙擊執行 `Maker IDE 1.0.0.exe`。
3. 首次啟動時，請等待終端機畫面跑完核心下載進度（需保持網路連線）。
4. 完成後即可開始寫程式，並點擊「Compile & Flash」一鍵燒錄！

### 方式二：本地開發與打包 (Node.js)
如果您想要修改原始碼並自行打包：

1. **安裝依賴**：
   ```bash
   npm install
   ```
2. **啟動開發環境**：
   ```bash
   npm run dev
   ```
   *(這會同時啟動前端 Vite 伺服器與後端 Express 編譯伺服器)*
3. **打包成獨立的 EXE**：
   ```bash
   npm run pack:desktop
   ```
   打包完成的檔案將會放置在 `release/` 目錄下。

### 方式三：作為純 Web 服務器啟動 (Docker)
如果您只想要將其部署在一台伺服器上供多人透過瀏覽器使用：
```bash
docker compose up --build -d
```
啟動後，開啟瀏覽器並前往：`https://localhost:3000` *(注意：瀏覽器基於安全性限制，Web Serial API 必須在 HTTPS 或是 localhost 環境下才能運作)*。
