const { app, BrowserWindow, ipcMain } = require('electron');
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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

  const frontendDistPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
  
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

function setupIpcHandlers() {
  // 動態載入編譯過後的服務 (必須在 TypeScript 編譯後執行)
  const { compileCode, initSystem, getInstalledBoards, installBoard, getInstalledLibraries, installLibrary } = require('./dist/arduinoService.js');

  ipcMain.handle('compile', async (event, { code, boardType }) => {
    const result = await compileCode(code, boardType);
    // IPC 無法直接傳遞 Buffer，將其轉為 Uint8Array 或讓前端處理
    if (result.success && result.fileBuffer) {
        // 將 Buffer 轉為標準的陣列傳給前端
        return { success: true, fileBuffer: Array.from(result.fileBuffer), ext: result.ext };
    }
    return { success: false, error: result.error };
  });
  
  ipcMain.handle('get-installed-boards', async () => {
    return await getInstalledBoards();
  });

  ipcMain.handle('get-installed-libraries', async () => {
    return await getInstalledLibraries();
  });

  ipcMain.handle('install-library', async (event, { libName }) => {
    try {
      const msg = await installLibrary(libName);
      return { success: true, message: msg };
    } catch(err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('init-system', async (event) => {
    try {
      await initSystem((msg) => event.sender.send('system-progress', msg));
      event.sender.send('system-progress', '[DONE]');
    } catch (e) {
      event.sender.send('system-progress', `[ERR] ${e.message}`);
      event.sender.send('system-progress', '[DONE]');
    }
  });

  ipcMain.handle('install-board', async (event, { core }) => {
    try {
      await installBoard(core, (msg) => event.sender.send('system-progress', msg));
      event.sender.send('system-progress', '[DONE]');
    } catch (e) {
      event.sender.send('system-progress', `[ERR] ${e.message}`);
      event.sender.send('system-progress', '[DONE]');
    }
  });
}

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
  if (mainWindow === null) {
    createWindow();
  }
});
