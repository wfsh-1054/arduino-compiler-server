FROM node:20-slim

# 安裝 setup.js 會使用到的基礎工具 (curl) 與憑證工具 (openssl)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 複製 package.json 與 scripts 資料夾，以及 frontend 的 package.json，因為 npm install 會觸發 postinstall 腳本
COPY package*.json ./
COPY scripts/ scripts/
COPY frontend/package*.json ./frontend/
RUN npm install

# 複製專案其餘檔案
COPY . .

# 生成憑證並編譯前端與後端
RUN npm run cert && npm run build

EXPOSE 3000

# 啟動正式伺服器
CMD ["node", "dist/server.js"]