# 待辦與功能追蹤表 (Features & TODO Tracker)

這份文件用於統整專案未來的開發計畫、待辦清單，以及已經完成的功能與實作紀錄。

> **💡 核心架構理念：專案導向 (Project-based)**
> 考量到未來可能需要加入自定義函式庫 (`.cpp`, `.h`)、Little FS、韌體文件等，整個編輯器的底層邏輯應以 **「專案 (Project)」** 為單位，而非單一的「資料夾 (Folder)」或「草稿碼 (Sketch)」。所有檔案操作都是在專案的範圍內進行。

## 🏷️ 標籤分類說明
* `[Frontend]`：React UI 元件、狀態管理 (Hooks)、前端 API 封裝、Web Serial API。
* `[Node.js]`：Express 後端路由、SSE 串流、後端商業邏輯 (`services`)。
* `[Electron]`：桌面端主進程 (`window.js`)、原生對話框 (`dialog`)、IPC 通訊 (`ipcHandlers.js`)。
* `[Arduino CLI]`：底層 Arduino CLI 執行檔呼叫。
* `[Docker]`：容器化環境建置。

---

## 📝 待辦清單 (TODO) - 參考 Arduino IDE 選單架構

### 📁 檔案 (File) 選單
- [ ] **建立空白專案 (New Blank Project)** `[Frontend]` `[Electron]`
  - 初始化一個全新的專案結構，包含預設的 `.ino` 檔案。
- [x] **儲存專案 (Save)** `[Frontend]` `[Node.js]` `[Electron]` *(已實作基礎版本)*
- [x] **另存專案 (Save As...)** `[Frontend]` `[Node.js]` `[Electron]` *(已實作基礎版本)*
- [ ] **範例專案 (Examples)** `[Frontend]` `[Node.js]` `[Arduino CLI]`
  - 瀏覽並載入 Arduino 內建或函式庫附帶的範例。
- [ ] **喜好設定 (Preferences)** `[Frontend]`
  - 設定字體、主題、預設開發板、編譯器警告等級等。
- [ ] **遠端... (Remote...)** `[Frontend]` `[Node.js]`
  - 存取雲端或遠端設備上的專案。

### ✂️ 編輯 (Edit) 選單
*(主要與 Monaco Editor API 深度整合)*
- [ ] **復原 (Undo)** / **取消復原 (Redo)** `[Frontend]`
- [ ] **全選 (Select All)** `[Frontend]`
- [ ] **剪下 (Cut)** / **複製 (Copy)** / **貼上 (Paste)** `[Frontend]`
- [ ] **尋找 (Find)** / **取代 (Replace)** `[Frontend]`
- [ ] **格式化文件 (Format Document)** `[Frontend]` `[Node.js]`
  - 整合 `clang-format` 進行程式碼自動排版。

### 🚀 草稿碼 (Sketch) 選單
- [ ] **開發板 (Board)** `[Frontend]` (從 Sidebar 移入或聯動選單)
- [ ] **序列埠 (Port)** `[Frontend]` (從 Modal 移入或聯動選單)
- [x] **編譯 (Verify/Compile)** `[Frontend]` `[Node.js]` `[Arduino CLI]` *(已實作)*
- [x] **上傳 (Upload)** `[Frontend]` *(已實作 Web Serial)*
- [ ] **匯出編譯文件 (Export Compiled Binary)** `[Frontend]` `[Electron]`
  - 將編譯好的 `.hex` 或 `.bin` 檔案匯出到指定目錄。
- [ ] **燒錄編譯文件 (Burn Bootloader)** `[Frontend]` `[Node.js]` `[Arduino CLI]`
- [ ] **OTA 更新...** `[Frontend]` `[Node.js]`

### 🛠️ 工具 (Tools) 選單
- [ ] **開發板管理員 (Board Manager)** `[Frontend]` `[Node.js]` `[Electron]` `[Arduino CLI]`
- [ ] **程式庫管理員 (Library Manager)** `[Frontend]` `[Node.js]` `[Electron]` `[Arduino CLI]`

---

## ✅ 已完成功能紀錄 (Completed Features)

### v1.2 - 選單列與手動存檔
- [x] **選單列 UI 實作** `[Frontend]`
  - 建立橫跨畫面頂部的 `MenuBar.tsx`。
- [x] **雙環境手動存檔 (Save As...)** `[Frontend]` `[Electron]`
  - 加入 `Ctrl+S` / `Cmd+S` 全域防呆快捷鍵。
  - **Web 版**：以 Blob 形式觸發瀏覽器下載。
  - **Electron 版**：呼叫 `dialog.showSaveDialog`，自動遵守 Arduino 規範建立同名資料夾，並支援同名覆寫警告。

### v1.1 - 基礎雲端編譯與燒錄 (核心打通)
- [x] **系統環境自動初始化** `[Frontend]` `[Node.js]` `[Arduino CLI]`
  - 伺服器啟動時自動檢查並安裝 `arduino:avr` 預設核心。
- [x] **程式碼編輯器** `[Frontend]`
  - 整合 Monaco Editor，提供語法高亮。
- [x] **雲端編譯 API** `[Frontend]` `[Node.js]` `[Arduino CLI]`
  - 實作雙軌路由：由後端呼叫 `arduino-cli compile` 後，將編譯完成的 Hex Buffer 傳回前端。
- [x] **純前端燒錄機制** `[Frontend]`
  - 運用 `Web Serial API`，將 Hex 檔透過 USB 直接寫入開發板，無需後端介入。
- [x] **序列埠終端機 (Serial Monitor)** `[Frontend]`
  - 讀取序列埠資料流並即時顯示於畫面下方面板。
