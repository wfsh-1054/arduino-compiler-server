const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('makerApi', {
  // 基礎編譯與取得資訊
  compile: (code, boardType) => ipcRenderer.invoke('compile', { code, boardType }),
  upload: (fileBuffer, boardType, portName, ext) => ipcRenderer.invoke('upload', { fileBuffer, boardType, portName, ext }),
  getInstalledBoards: () => ipcRenderer.invoke('get-installed-boards'),
  getInstalledLibraries: () => ipcRenderer.invoke('get-installed-libraries'),
  installLibrary: (libName) => ipcRenderer.invoke('install-library', { libName }),
  
  // 長時間執行的進度回報
  initSystem: () => ipcRenderer.invoke('init-system'),
  installBoard: (core) => ipcRenderer.invoke('install-board', { core }),
  
  // 監聽進度訊息
  onProgress: (callback) => {
    // 移除舊的監聽器避免重複
    ipcRenderer.removeAllListeners('system-progress');
    ipcRenderer.on('system-progress', (event, msg) => callback(msg));
  },

  // 序列埠手動選擇 API
  onSerialPortRequest: (callback) => {
    ipcRenderer.removeAllListeners('serial-port-request');
    ipcRenderer.on('serial-port-request', (event, portList) => callback(portList));
  },
  selectSerialPort: (portId) => ipcRenderer.send('serial-port-selected', portId),
  cancelSerialPort: () => ipcRenderer.send('serial-port-cancelled')
});
