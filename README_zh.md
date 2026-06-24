# Arduino 雲端編譯與網頁燒錄伺服器 (Arduino Compiler Server)

這是一個全端應用程式，允許使用者在**瀏覽器中撰寫 Arduino 程式碼**，透過後端伺服器進行編譯，然後利用 Web Serial API **直接從網頁將韌體燒錄到 Arduino 開發板**，全程不需要安裝桌上版 Arduino IDE。

## 🌟 核心特色

- **零安裝**：無需在本地電腦安裝龐大的 Arduino IDE 或設定開發環境。
- **雲端編譯**：透過後端伺服器 (Node.js + `arduino-cli`) 快速編譯程式碼。
- **無縫燒錄**：利用 Web Serial API 及 `avrgirl-arduino`，直接在瀏覽器背景將編譯好的韌體燒錄進開發板。
- **一次授權**：優化過的使用者體驗，只需選擇一次連接埠，後續編譯與燒錄皆在背景自動完成，無煩人的重複彈窗。
- **Docker 支援**：提供 Dockerfile 與 docker-compose 檔案，一鍵啟動完整服務環境。
- **HTTPS 支援**：內建 HTTPS 伺服器，確保 Web Serial API 能在本地網路正常運行（Web Serial API 需要安全上下文環境）。

## 🏗️ 系統架構

系統主要分為「前端網頁介面」與「後端編譯伺服器」兩個部分：

### 1. 前端 (Frontend)
- **檔案**：`public/index.html`
- **技術棧**：HTML, CSS, JavaScript, Web Serial API, [avrgirl-arduino](https://github.com/noopkat/avrgirl-arduino)
- **運作流程**：
  1. 提供一個簡單的文字編輯區 (`<textarea>`) 讓使用者撰寫程式碼。
  2. 使用者點擊按鈕授權網頁存取 Arduino 的序列埠 (`navigator.serial.requestPort()`)。
  3. 將程式碼透過 `POST /api/compile` 發送至後端。
  4. 接收後端回傳的二進位韌體檔 (`.hex` 或 `.bin`)。
  5. 透過攔截原生序列埠請求（避免重複彈窗），將韌體資料交由 `avrgirl-arduino` 執行瀏覽器端燒錄。

### 2. 後端 (Backend)
- **檔案**：`src/server.ts`
- **技術棧**：Node.js, Express, TypeScript, `arduino-cli`
- **運作流程**：
  1. 啟動 HTTPS 伺服器並提供靜態網頁（前端）。
  2. 提供 `/api/compile` API 接收前端傳來的程式碼與開發板類型。
  3. 為每次編譯請求建立獨立的暫時工作目錄（避免併發衝突）。
  4. 呼叫系統內的 `arduino-cli` 工具進行實際的編譯作業。
  5. 編譯成功後，將輸出的二進位檔案回傳給前端；完成後自動清理暫存目錄。

### 3. 部署 (Deployment)
- **檔案**：`Dockerfile`, `docker-compose.yml`
- **技術棧**：Docker
- **運作流程**：基於 `node:20-slim`，自動安裝 `arduino-cli` 及相關核心（如 `arduino:avr`），隔離編譯環境並確保依賴完整性。

## 🚀 快速開始

### 使用 Docker 啟動 (推薦)

只需一行指令即可啟動包含 `arduino-cli` 的完整環境：

```bash
docker compose up --build -d
```

啟動後，開啟瀏覽器並前往：`https://localhost:3000`

### 本地直接啟動 (Node.js)

透過內建的自動化腳本，您**不需**事先安裝 `arduino-cli`，只要有 Node.js 環境即可無縫啟動：

1. **安裝依賴與自動化環境建置**：
   ```bash
   npm install
   ```
   *(註：此指令會自動觸發 `postinstall` 腳本，為您的作業系統下載對應的 `arduino-cli` 工具，並自動安裝 `arduino:avr` 核心，需時數分鐘請耐心等待。)*

2. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

3. 開啟瀏覽器並前往：`https://localhost:3000`

---
> **注意**：由於 Web Serial API 的安全限制，即使在本地開發，也必須透過 HTTPS (或 `http://localhost`) 來訪問網頁，否則瀏覽器將不允許存取序列埠。
