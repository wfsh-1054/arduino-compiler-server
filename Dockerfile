# 使用輕量級的 Node.js 20 影像（Linux 環境）
FROM node:20-slim

# 安裝 Linux 下載軟體必備的 curl 與憑證
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 1. 🚀 下載並安裝「Linux 版本」的 arduino-cli 到系統路徑
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# 2. 初始化並下載 Arduino Uno 開發板核心
RUN arduino-cli core update-index && \
    arduino-cli core install arduino:avr

# 設定容器內的工作目錄
WORKDIR /app

# 複製依賴檔案並安裝（包含開發環境的 typescript 核心）
COPY package*.json ./
RUN npm install

# 複製專案所有原始碼與網頁檔案
COPY . .

# 3. 🧠 關鍵：在 Docker 內將 src/*.ts 編譯成 dist/*.js
RUN npx tsc

# 開放 3000 連接埠
EXPOSE 3000

# 正式運行：直接用原生的 node 去執行編譯好的 Linux 版 JS 檔
CMD ["node", "dist/server.js"]