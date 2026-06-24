# 架構設計與環境差異文件 (ARCHITECTURE.md)

本文件紀錄 Arduino Compiler Server 在原生 Node.js 環境（Windows/macOS/Linux）與 Docker 環境之間的部署差異與架構設計。

## 1. 原生 Node.js 版本 (當前主要開發目標)

為了追求最佳的開發體驗、最快的編譯速度以及最方便的除錯（例如 Serial Monitor），我們目前優先保證原生 Node.js 版本的穩定性。

### 開箱即用 (Portable) 機制
- **自帶編譯器**：透過執行 `npm run setup`，專案會自動依照目前的作業系統下載最新的 `arduino-cli` 執行檔，並放置於 `bin/` 目錄下。
- **環境隔離**：透過在後端 `server.ts` 中設定 `ARDUINO_DATA_DIR` 與 `ARDUINO_USER_DIR` 環境變數，強制將所有開發板核心（Cores）與第三方函式庫安裝於專案的 `.arduino-data/` 目錄中，絕不會污染開發者電腦上的原有 Arduino IDE。
- **動態串流介面**：採用 Server-Sent Events (SSE) 技術，在安裝開發板核心時，能將 `arduino-cli` 的標準輸出 (`stdout`) 即時串流至前端介面，解決長耗時任務的進度條顯示問題。

## 2. Docker 容器版本落差與未來對齊計畫

Docker 版本最初是為了解決不同系統下 `arduino-cli` 相依套件安裝困難的問題所建立。然而，隨著專案功能快速迭代，Docker 版本目前存在以下落差：

### 目前差異點
1. **執行檔來源**：
   - **Node.js**：使用 `scripts/setup.js` 自動抓取最新版放在 `bin/`。
   - **Docker**：目前在 `Dockerfile` 中透過 `curl ... install.sh` 寫死下載安裝邏輯。
2. **初始化機制**：
   - **Node.js**：前端提供「一鍵初始化」按鈕，透過 `/api/system/init` 動態下載 Uno 核心並顯示進度。
   - **Docker**：目前在 `Dockerfile` 中寫死了 `RUN arduino-cli core update-index && arduino-cli core install arduino:avr`，導致容器建置時間較長且進度不透明。
3. **Volume 權限問題**：
   - 掛載 `.arduino-data` 時，Linux 系統下的 Docker 容器內部使用者（root/node）可能會遇到掛載目錄的權限 (Permission Denied) 衝突，而 Windows/macOS 的 Docker Desktop 則會自動轉換權限。

### 待後續更新的目標
- **重構 Dockerfile**：移除寫死的 `core install` 步驟，讓容器啟動後，依賴前端的「系統初始化」按鈕來動態安裝核心至掛載的 `.arduino-data` 中，以縮短建置時間並統一初始化流程。
- **權限修復**：在 Docker entrypoint 腳本中處理 `.arduino-data` 的目錄權限（例如 `chown`），確保隔離環境讀寫正常。

---
*文件更新時間: 2026-06*
