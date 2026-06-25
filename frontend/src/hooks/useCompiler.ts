import { useState } from 'react';
import { api } from '../api/makerApi';

export function useCompiler(addLog: (msg: string) => void) {
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompileAndFlash = async (
    code: string,
    boardType: string,
    portRef: React.MutableRefObject<any>,
    isMonitorOpen: boolean,
    closeSerialPort: () => Promise<void>,
    setIsMonitorOpen: (v: boolean) => void,
    connectedPortName: string,
    originalRequestPortRef: React.MutableRefObject<any>
  ) => {
    if (!portRef.current) {
      addLog("[ERR] 請先選擇連接埠！");
      return;
    }

    if (isMonitorOpen) {
      addLog("[SYS] 暫停 Serial Monitor 以進行燒錄...");
      await closeSerialPort();
      setIsMonitorOpen(false);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } else {
      if (portRef.current) {
        try {
          await portRef.current.open({ baudRate: 9600 });
          await portRef.current.close();
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (e) { }
      }
    }

    setIsCompiling(true);
    addLog("[BUILD] ⏳ 正在將程式碼傳送至後端編譯中...");

    try {
      const res = await api.compile(code, boardType);

      if (window.makerApi) {
        if (!res.success) throw new Error(res.error);
        addLog(`[BUILD] 🎯 編譯成功！開始將韌體燒錄至 ${connectedPortName}...`);
        const uploadRes = await api.upload(res.fileBuffer, boardType, connectedPortName, res.ext!);
        setIsCompiling(false);

        if (!uploadRes.success) {
          throw new Error(uploadRes.error);
        }
        addLog("[FLASH] 🎉 程式已自動由原生引擎燒錄完成！您可以再次開啟 Monitor 查看輸出。");
        return;
      } else {
        const hexBuffer = res.fileBuffer; // ArrayBuffer
        addLog("[BUILD] 🎯 編譯成功！開始背景寫入晶片...");

        navigator.serial.requestPort = async () => portRef.current;
        const avrgirl = new window.AvrgirlArduino({ board: 'uno', debug: false });
        
        avrgirl.flash(hexBuffer, (err: any) => {
          navigator.serial.requestPort = originalRequestPortRef.current;
          setIsCompiling(false);
          if (err) {
            addLog(`[ERR] ❌ 燒錄失敗: ${err.message}`);
          } else {
            addLog("[FLASH] 🎉 程式已自動燒錄完成！您可以再次開啟 Monitor 查看輸出。");
          }
        });
      }
    } catch (error: any) {
      if (!window.makerApi) {
        navigator.serial.requestPort = originalRequestPortRef.current;
      }
      setIsCompiling(false);
      addLog(`[ERR] ❌ 錯誤: ${error.message}`);
    }
  };

  return {
    isCompiling,
    handleCompileAndFlash
  };
}
