# 專案程式碼結構與用途說明 (Codebase Structure)

這份文件概述了 Maker IDE 的專案目錄結構以及各個資料夾/檔案的具體用途，幫助開發者快速理解並參與開發。

本專案採用 **Monorepo (單一程式碼庫)** 的風格，同時包含了 Node.js Express 後端、React 前端以及 Electron 桌面端外殼。

---

## 📂 根目錄 (Root Directory)

根目錄主要放置專案的全域設定檔、環境設定以及 Electron 的進入點。

* `package.json`：專案的相依套件與執行腳本 (scripts)，定義了 `npm run dev`、`build`、`pack:desktop` 等核心指令。
* `main.js` & `preload.js`：Electron 桌面應用的核心進入點。`main.js` 負責建立視窗與底層系統互動，`preload.js` 負責作為網頁前端與底層作業系統的橋樑。
* `docker-compose.yml` & `Dockerfile`：用於構建與啟動 Docker 容器化版本的設定檔。
* `server.crt` & `server.key`：用於提供 HTTPS 加密連線的自簽證書，確保 Web Serial API 在瀏覽器中能正常運作。

---

## 🛠️ `src/` (Node.js 後端服務)

這個資料夾包含了提供編譯服務的 Express.js API 伺服器，它是整個系統能與 `arduino-cli` 互動的核心。

* `server.ts`：後端伺服器的進入點，負責啟動 Express 應用程式、載入路由，並在偵測到 React 編譯檔時提供靜態網頁服務。
* `routes/`：API 路由控制器。
  * `compileRoutes.ts`：處理程式碼接收與呼叫編譯的 API。
  * `boardRoutes.ts`：處理開發板核心搜尋與安裝的 API。
  * `libraryRoutes.ts`：處理第三方函式庫搜尋與安裝的 API。
  * `systemRoutes.ts`：處理伺服器系統初始化 (如安裝預設核心) 的 API。
* `services/`：負責實際呼叫外部 `arduino-cli` 執行檔並處理輸出的商業邏輯層。
* `config/`：存放後端環境變數與全域設定。

---

## 🎨 `frontend/` (React 前端介面)

這個資料夾是一個獨立的 Vite + React 專案，負責呈現給使用者的圖形化操作介面。

* `package.json`：前端專屬的相依套件庫 (包含 React, Vite, TailwindCSS, Monaco Editor 等)。
* `src/App.tsx`：前端的總指揮元件，負責整體的頁面佈局 (Layout) 與狀態整合。
* `src/components/`：**視覺化 UI 元件庫**。
  * `CodeEditor.tsx`：封裝 Monaco Editor 的程式碼編輯區。
  * `TopBar.tsx`：頂部控制列，包含編譯燒錄、開啟監控等按鈕。
  * `Sidebar.tsx`：側邊欄，包含開發板與函式庫的管理選單。
  * `TerminalPanel.tsx`：下方的終端機面板，用於顯示編譯日誌與 Serial 印出的資料。
* `src/hooks/`：**自訂的 React Hooks (邏輯層)**。
  * `useSerial.ts`：封裝瀏覽器 Web Serial API，負責處理與開發板的連線、讀寫與斷線邏輯。
  * `useCompiler.ts`：負責處理將程式碼發送至後端編譯的狀態與流程控制。
* `src/api/`：封裝呼叫 Node.js 後端 API 的 `fetch`/`axios` 邏輯。

---

## 📁 隱藏/系統生成資料夾

* `bin/`：執行 `npm run setup` 後，存放系統自動下載的 `arduino-cli` 執行檔的位置。
* `scripts/`：存放輔助腳本（例如 `setup.js` 負責判斷作業系統並下載對應的 `arduino-cli`，`cert.js` 負責產生 HTTPS 憑證）。
* `.arduino-data/`：Arduino 核心的「隔離環境」。所有下載的開發板核心與函式庫都會存放在這裡，確保絕對不會弄壞開發者原本電腦上安裝的 Arduino IDE。
* `docs/`：存放專案的架構、藍圖等開發說明文件。
* `release/`：執行 `npm run pack:desktop` 後，產出的 Windows/Mac 免安裝執行檔 (`.exe` 或 `.dmg`) 會放在這個資料夾。

---

## 🗺️ 功能對應關係表 (Feature Architecture Mapping)

這張表清楚展示了**從使用者點擊畫面的那一刻起，資料是如何一步步傳遞到最底層的硬體或編譯器**：

| 功能模組 (Feature) | UI 元件 (Component) | 邏輯層 (React Hook) | 前端 API (API Wrapper) | Node.js 後端路由 | 底層執行機制 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **程式碼編輯** | `CodeEditor.tsx` | *(無，直接綁定 State)* | *(無)* | *(無)* | Monaco Editor |
| **雲端編譯程式** | `TopBar.tsx` | `useCompiler.ts` | `api.compile()` | `/api/compile` | `arduino-cli compile` |
| **開發板燒錄** | `TopBar.tsx`<br>`PortSelectModal.tsx` | `useSerial.ts`<br>`useCompiler.ts` | *(無)* | *(無)* | 瀏覽器原生 `Web Serial API` |
| **序列埠監控** | `TerminalPanel.tsx` | `useSerial.ts` | *(無)* | *(無)* | 瀏覽器原生 `Web Serial API` |
| **函式庫管理** | `Sidebar.tsx` | `useLibrary.ts` *(規劃中)* | `api.installLibrary()` | `/api/libraries/*` | `arduino-cli lib` |
| **開發板管理** | `Sidebar.tsx` | `useBoard.ts` *(規劃中)* | `api.getInstalledBoards()` | `/api/boards/*` | `arduino-cli core` |
| **系統環境初始化** | `App.tsx` (useEffect) | *(無)* | `api.initSystem()` | `/api/system/init` | `arduino-cli core install` |

> **💡 開發提示：** 
> 透過上表可以發現，若是與**硬體通訊**（燒錄、監控）相關的功能，前端會直接透過 Hook 呼叫瀏覽器 API，**完全不需要經過 Node.js 後端**。而若是與**檔案、編譯、下載**相關的功能，就必須完整走完 `Hook -> 前端 API -> 後端 Route -> arduino-cli` 的完整流程。
