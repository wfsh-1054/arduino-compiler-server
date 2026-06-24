FROM node:20-slim

# 安裝 setup.js 會使用到的基礎工具 (curl)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 複製 package.json 與 scripts 資料夾，因為 npm install 會觸發 postinstall 腳本
COPY package*.json ./
COPY scripts/ scripts/
RUN npm install

# 複製專案其餘檔案
COPY . .

EXPOSE 3000

# 啟動開發伺服器
CMD ["npm", "run", "dev"]