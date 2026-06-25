export const api = {
  getInstalledBoards: async () => {
    if (window.makerApi) {
      return await window.makerApi.getInstalledBoards();
    } else {
      const res = await fetch('/api/boards/installed');
      if (!res.ok) throw new Error(`伺服器狀態 ${res.status}`);
      const data = await res.json();
      return data.data; // Server wraps in { success: true, data: ... }
    }
  },

  initSystem: async (onProgress: (msg: string) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.makerApi) {
        window.makerApi.onProgress((msg: string) => {
          onProgress(msg);
          if (msg === '[DONE]') resolve();
        });
        window.makerApi.initSystem().catch(reject);
      } else {
        const eventSource = new EventSource('/api/system/init');
        eventSource.onmessage = (e) => {
          onProgress(e.data);
          if (e.data === '[DONE]') {
            eventSource.close();
            resolve();
          }
        };
        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error("系統初始化連線發生異常，請重試"));
        };
      }
    });
  },

  installLibrary: async (libSearch: string): Promise<{ success: boolean, error: string }> => {
    if (window.makerApi) {
      return await window.makerApi.installLibrary(libSearch);
    } else {
      const res = await fetch('/api/libraries/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libName: libSearch })
      });
      return await res.json();
    }
  },

  compile: async (code: string, boardType: string): Promise<{ success: boolean, fileBuffer?: any, error?: string, ext?: string }> => {
    if (window.makerApi) {
      return await window.makerApi.compile(code, boardType);
    } else {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardType, code })
      });
      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText || "伺服器無回應或發生未知錯誤";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error) errMsg = errJson.error;
        } catch (e) { }
        throw new Error(`HTTP ${response.status}: ${errMsg}`);
      }
      const hexBuffer = await response.arrayBuffer();
      // Web mode only returns the buffer
      return { success: true, fileBuffer: hexBuffer };
    }
  },

  upload: async (fileBuffer: any, boardType: string, connectedPortName: string, ext: string) => {
    if (window.makerApi) {
      return await window.makerApi.upload(fileBuffer, boardType, connectedPortName, ext);
    }
    throw new Error("Not supported in Web mode natively");
  },

  saveCodeAs: async (code: string): Promise<string | undefined> => {
    if (window.makerApi) {
      // Electron mode: use native save dialog, returns saved path
      return await window.makerApi.saveFileAs(code);
    } else {
      // Web mode: download as sketch.ino
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sketch.ino';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
      return undefined; // Web 模式不會有明確的路徑
    }
  },

  saveCodeDirect: async (code: string, filePath: string): Promise<boolean> => {
    if (window.makerApi) {
      return await window.makerApi.saveFileDirect(code, filePath);
    }
    throw new Error("Web 模式不支援直接無聲覆寫實體檔案");
  },

  formatCode: async (code: string): Promise<string> => {
    try {
      if (window.makerApi && window.makerApi.formatCode) {
        // Electron mode
        return await window.makerApi.formatCode(code);
      } else {
        // Web mode
        const response = await fetch('/api/format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.formattedCode;
      }
    } catch (e: any) {
      console.error('Format error:', e);
      throw e;
    }
  }
};
