const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createWindow } = require('./electron/window');
const { setupIpcHandlers } = require('./electron/ipcHandlers');

// 忽略自簽憑證的錯誤
app.commandLine.appendSwitch('ignore-certificate-errors');

app.on('ready', () => {
  // 設定環境變數，將需要寫入的資料夾指向使用者的 AppData 目錄，避免寫入唯讀的 ASAR 壓縮檔
  process.env.ARDUINO_DATA_DIR = path.join(app.getPath('userData'), '.arduino-data');
  process.env.WORKSPACE_DIR = path.join(app.getPath('userData'), 'tmp_workspace');
  
  // 建立 IPC 通道
  setupIpcHandlers();
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
