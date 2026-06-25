const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Maker IDE",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  // 隱藏預設選單列
  mainWindow.setMenuBarVisibility(false);

  // 儲存序列埠選擇的回呼函數
  let serialPortSelectionCallback = null;

  // Web Serial API 權限與埠號手動選擇處理
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    
    // 將 callback 存起來，等待前端回傳使用者的選擇
    serialPortSelectionCallback = callback;
    
    // 通知前端彈出選擇視窗，並傳送所有可用的 Port
    mainWindow.webContents.send('serial-port-request', portList);
  });

  // 接收前端使用者的選擇
  ipcMain.on('serial-port-selected', (event, portId) => {
    if (serialPortSelectionCallback) {
      serialPortSelectionCallback(portId);
      serialPortSelectionCallback = null;
    }
  });

  // 接收前端使用者的取消
  ipcMain.on('serial-port-cancelled', (event) => {
    if (serialPortSelectionCallback) {
      serialPortSelectionCallback('');
      serialPortSelectionCallback = null;
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

  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  
  if (fs.existsSync(frontendDistPath)) {
    // 讀取本地打包好的網頁檔
    mainWindow.loadFile(frontendDistPath);
  } else {
    // 開發模式讀取 Vite 伺服器
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

module.exports = { createWindow };
