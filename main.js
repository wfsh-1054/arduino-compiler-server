const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// 忽略自簽憑證的錯誤
app.commandLine.appendSwitch('ignore-certificate-errors');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Maker IDE",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 隱藏預設選單列
  mainWindow.setMenuBarVisibility(false);

  // Web Serial API 權限與埠號自動選擇處理
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      // 自動選擇第一個可用的序列埠
      callback(portList[0].portId);
    } else {
      callback(''); // 沒有可用埠號，取消
    }
  });

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'serial') return true;
    return false;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') return true;
    return false;
  });

  // 判斷伺服器是否運行在 HTTPS (在打包環境下，extraResources 會放在 process.resourcesPath)
  const keyPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'server.key') 
    : path.join(__dirname, 'server.key');
  const certPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'server.crt') 
    : path.join(__dirname, 'server.crt');
  const isHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);
  const baseUrl = isHttps ? 'https://127.0.0.1:3000' : 'http://127.0.0.1:3000';

  // 由於伺服器啟動需要一點時間，我們使用一個簡單的重試機制來載入頁面
  const loadUrlWithRetry = (url, retries = 10) => {
    mainWindow.loadURL(url).catch((err) => {
      if (retries > 0) {
        setTimeout(() => loadUrlWithRetry(url, retries - 1), 500);
      } else {
        console.error('Failed to load local server:', err);
      }
    });
  };

  loadUrlWithRetry(baseUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // 設定環境變數，將需要寫入的資料夾指向使用者的 AppData 目錄，避免寫入唯讀的 ASAR 壓縮檔
  process.env.ARDUINO_DATA_DIR = path.join(app.getPath('userData'), '.arduino-data');
  process.env.WORKSPACE_DIR = path.join(app.getPath('userData'), 'tmp_workspace');
  
  const keyPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'server.key') 
    : path.join(__dirname, 'server.key');
  const certPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'server.crt') 
    : path.join(__dirname, 'server.crt');

  // 憑證在打包環境下，將指向外部 resources 目錄以確保正常讀取
  process.env.SERVER_KEY_PATH = keyPath;
  process.env.SERVER_CERT_PATH = certPath;

  // 在 Electron 主進程中啟動我們的 Express 伺服器
  console.log('Starting Express server...');
  require('./dist/server.js');

  createWindow();
});

app.on('window-all-closed', () => {
  // 在 Mac 上通常會保留應用程式在 Dock 中
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
