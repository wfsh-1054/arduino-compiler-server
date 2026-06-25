# Maker IDE (Arduino 雲端/本地編譯與輕量化桌面環境)

Maker IDE 是一個專為創客設計的輕量級、現代化 Arduino 開發環境。我們將 **React 前端介面（搭載 Monaco 編輯器）** 與 **模組化的 Express 背景編譯伺服器** 完美封裝成單一的 **Electron 桌面應用程式 (.exe)**。使用者可以在免安裝龐大官方 IDE 的情況下，享受程式碼語法高亮、自動補全，並透過 Web Serial API 將韌體無縫燒錄至 Arduino 開發板中。

## 🌟 核心特色

- **極致輕量與免安裝 (Portable)**：應用程式本體經高度優化，不需繁瑣設定，解壓點開即用。
- **Monaco 程式碼編輯器**：整合與 VS Code 相同的編輯器引擎，提供：
  - C++/Arduino 程式碼的**語法高亮**。
  - Arduino 常用 API 的**智慧自動補全**（例如：`setup()`、`loop()`、`pinMode()`、`digitalWrite()`、`Serial.println()`、`delay()`）。
- **首次啟動自動配置**：第一次開啟應用程式時，後端會在背景自動下載並安裝所有的 Arduino AVR 編譯核心。超過 800MB 的工具鏈資料會安全且安靜地存放在您的系統 `AppData` 目錄中，保持執行檔本身的輕巧。
- **一鍵秒連 COM Port**：透過深度整合 Web Serial API 與 Electron 底層，只要插上 Arduino 開發板並點擊「Select Serial Port」，系統就會自動連接，免去反覆挑選連接埠的麻煩。
- **無縫背景燒錄**：利用 `avrgirl-arduino`，編譯完成後直接從前端介面將韌體寫入晶片，完全自動化。
- **多平台彈性支援**：除了作為桌面應用程式執行外，依舊保留了作為純 Web 伺服器運作的能力（支援 Docker 與 Node.js 直接啟動）。

---

## 🏗️ 系統架構

本專案已重構為高度模組化的全端架構：

### 1. 桌面封裝 (Electron Main Process) — `/main.js` & `/electron`
- **`main.js`**：應用程式的進入點。
- **`electron/window.js`**：負責視窗建立、生命週期管理與安全性設定。
- **`electron/ipcHandlers.js`**：負責處理系統級的 IPC 通訊事件、檔案路徑管理，以及自動授權硬體存取（Web Serial API）。

### 2. 前端介面 (React Frontend) — `/frontend`
- **技術棧**：React, Vite, TypeScript, Monaco Editor, TailwindCSS (用於美化介面), `avrgirl-arduino`。
- **`frontend/src/components/`**：模組化的 UI 元件（如 `CodeEditor`、`Sidebar`、`TerminalPanel`、`TopBar`、`PortSelectModal`）。
- **`frontend/src/hooks/`**：用於管理狀態與後端流程的自定義 Hooks。
- **`frontend/src/api/`**：負責處理編譯狀態查詢、透過 Server-Sent Events (SSE) 監控編譯環境下載進度等 API 互動邏輯。

### 3. 編譯伺服器 (Express Backend) — `/src`
- **技術棧**：TypeScript, Node.js, Express, `arduino-cli`。
- **`src/server.ts`**：Express 編譯伺服器的進入點。
- **`src/routes/`**：模組化後的 API 路由（`compile.ts`、`board.ts`、`library.ts`、`system.ts`）。
- **`src/services/`**：核心編譯輔助服務（`arduinoService.ts` 負責環境配置與下載，`cliRunner.ts` 負責安全執行系統指令）。

---

## 🚀 快速開始

### 方式一：使用桌面應用程式 (最推薦)
1. 前往 GitHub Releases 頁面下載最新版壓縮檔。
2. 解壓縮後，雙擊執行 `Maker IDE.exe`。
3. 首次啟動時，請等待終端機畫面跑完編譯核心下載進度（需保持網路連線）。
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
3. **打包成獨立的可攜式 EXE**：
   ```bash
   npm run pack:desktop
   ```
   打包完成的免安裝檔案與解壓檔案將會放置在 `release/` 目錄下。

### 方式三：作為純 Web 伺服器啟動 (Docker)
如果您只想要將其部署在伺服器上供多人透過瀏覽器使用：
```bash
docker compose up --build -d
```
啟動後，開啟瀏覽器並前往：`https://localhost:3000`。
*(注意：瀏覽器基於安全性限制，Web Serial API 必須在 HTTPS 或是 localhost 環境下才能運作)*。
