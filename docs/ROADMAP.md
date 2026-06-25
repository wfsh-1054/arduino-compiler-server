# 未來功能開發藍圖 (Roadmap & Future Features)

本文件列出了 Maker IDE 後續預計開發的進階功能。這些功能旨在將目前的專案從基礎的工具，進一步打造成為「專業級的雲端 IDE」。

---

## 🌟 優先開發：核心體驗優化

### 1. 本地自動存檔與專案管理 (Auto-save & Sketch Management)
* **目標**：避免網頁重整後程式碼遺失，並允許多個專案切換。
* **實作方向**：
  * 利用瀏覽器的 `localStorage` 或 `IndexedDB` 實作程式碼自動備份。
  * 新增「我的專案 (My Sketches)」面板，提供儲存、讀取、刪除草稿碼的功能。

### 2. 支援多檔案專案 (Multi-file Support)
* **目標**：支援複雜的 Arduino 專案結構（包含標頭檔與多個程式檔）。
* **實作方向**：
  * 前端：實作「檔案樹 (File Tree)」與編輯器的「多頁籤 (Tabs)」，支援建立 `.ino`、`.cpp`、`.h` 檔案。
  * 後端：API 調整為接收多檔案（如 JSON 陣列或 ZIP），並於暫存區合併後交由 `arduino-cli` 編譯。

### 3. 即時錯誤標記 (Error Linting)
* **目標**：提供類似 VS Code 的直覺化除錯體驗。
* **實作方向**：
  * 後端解析 `arduino-cli` 的編譯錯誤訊息，提取「錯誤行號」與「具體原因」。
  * 前端利用 Monaco Editor 的 `markers` API，在程式碼對應的行數畫上「紅色波浪底線」，並於游標懸停時顯示錯誤提示。

---

## 🚀 進階開發：硬體與生態系擴展

### 4. 圖形化開發板管理員 (Board Manager UI)
* **目標**：取代現有簡單的下拉選單，提供完整的開發板核心安裝介面。
* **實作方向**：
  * 介面條列官方支援的開發板核心（如 ESP32, ESP8266, RP2040）。
  * 點擊安裝後，後端透過 API 呼叫 `arduino-cli core install` 並回傳安裝進度。

### 5. 圖形化函式庫管理員 (Library Manager UI)
* **目標**：提供完整的函式庫搜尋與安裝體驗。
* **實作方向**：
  * 利用 `arduino-cli lib search` 的結果，在介面以卡片形式展示函式庫名稱、版本號與描述。
  * 提供「一鍵安裝」與「版本選擇」功能。

### 6. 序列埠繪圖家 (Serial Plotter)
* **目標**：將開發板回傳的純文字數據視覺化。
* **實作方向**：
  * 擷取 Web Serial 傳來的數值（如感測器數據）。
  * 整合圖表套件（例如 `Chart.js` 或 `Recharts`），實作即時動態折線圖，重現官方 Arduino IDE 的 Serial Plotter 功能。

---

## ☁️ 長期目標：雲端化與社群整合

### 7. 雲端同步與 GitHub Gist 整合 (Cloud Sync)
* **目標**：讓使用者的程式碼可跨裝置存取與分享。
* **實作方向**：
  * 允許使用者透過 GitHub Personal Access Token (PAT) 綁定帳號。
  * 實作「一鍵發布至 GitHub Gist」功能。
  * 支援透過網址參數載入特定的 Gist 程式碼（例如：`?gist=123456`），方便教學展示。

### 8. WebUSB / WebBluetooth 無線燒錄
* **目標**：支援新一代開發板的免接線燒錄功能。
* **實作方向**：
  * 評估與整合瀏覽器的 WebUSB 與 WebBluetooth API。
  * 實作對應硬體的燒錄協議。
