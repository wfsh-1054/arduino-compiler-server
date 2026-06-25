const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function setupIpcHandlers() {
  // 動態載入編譯過後的服務 (必須在 TypeScript 編譯後執行)
  // 因為服務已經搬到 src/services，所以編譯後的路徑也會在 dist/services
  const arduinoService = require('../dist/services/arduinoService.js');
  const { compileCode, initSystem, getInstalledBoards, installBoard, getInstalledLibraries, installLibrary, uploadCode } = arduinoService;

  ipcMain.handle('compile', async (event, { code, boardType }) => {
    const result = await compileCode(code, boardType);
    // IPC 無法直接傳遞 Buffer，將其轉為 Uint8Array 或讓前端處理
    if (result.success && result.fileBuffer) {
        // 將 Buffer 轉為標準的陣列傳給前端
        return { success: true, fileBuffer: Array.from(result.fileBuffer), ext: result.ext };
    }
    return { success: false, error: result.error };
  });

  ipcMain.handle('upload', async (event, { fileBuffer, boardType, portName, ext }) => {
    const buffer = Buffer.from(fileBuffer);
    return await uploadCode(buffer, boardType, portName, ext);
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

  ipcMain.handle('save-file', async (event, code) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '另存草稿 (Save Sketch)',
      defaultPath: 'sketch.ino',
      filters: [{ name: 'Arduino Source', extensions: ['ino'] }]
    });

    if (canceled || !filePath) return false;

    try {
      // 確保 Arduino 的目錄規範：.ino 檔必須位於同名資料夾中
      const dirName = path.dirname(filePath);
      const fileName = path.basename(filePath, '.ino');
      const expectedDirName = path.basename(dirName);

      let finalPath = filePath;

      if (expectedDirName !== fileName) {
        const newDir = path.join(dirName, fileName);
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }
        finalPath = path.join(newDir, fileName + '.ino');
      }

      fs.writeFileSync(finalPath, code, 'utf-8');
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      throw e;
    }
  });
}

module.exports = { setupIpcHandlers };
