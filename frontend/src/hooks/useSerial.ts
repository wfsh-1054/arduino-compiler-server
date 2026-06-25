import { useState, useRef, useEffect } from 'react';

export function useSerial(addLog: (msg: string) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [portRequestList, setPortRequestList] = useState<any[] | null>(null);
  const [connectedPortName, setConnectedPortName] = useState<string>('');

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const originalRequestPortRef = useRef<any>(null);

  useEffect(() => {
    if (navigator.serial) {
      originalRequestPortRef.current = navigator.serial.requestPort.bind(navigator.serial);
    }

    if (window.makerApi) {
      window.makerApi.onSerialPortRequest((ports: any[]) => {
        setPortRequestList(ports);
      });
    }
  }, []);

  const closeSerialPort = async () => {
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch (e) {}
      readerRef.current = null;
    }
    if (portRef.current) {
      try { await portRef.current.close(); } catch (e: any) {
        console.error("Force close error:", e.message);
      }
    }
  };

  const handleSelectPort = async () => {
    try {
      if (!navigator.serial) {
        addLog("[ERR] ❌ 您的瀏覽器不支援 Web Serial API！請使用 Chrome 或 Edge，並確保在 localhost 或 HTTPS 環境下執行。");
        return;
      }
      if (portRef.current) {
        await closeSerialPort();
        setIsConnected(false);
        setIsMonitorOpen(false);
        portRef.current = null;
      }
      
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      setIsConnected(true);
      addLog("[COM] ✅ 成功連接至 Arduino 連接埠！");
    } catch (err: any) {
      addLog(`[COM] ❌ 連接失敗或已取消: ${err.message || '未知錯誤'}`);
    }
  };

  const readSerialData = async () => {
    if (!portRef.current) return;
    readerRef.current = portRef.current.readable.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await readerRef.current.read();
        if (done) break;
        if (value) {
          const text = decoder.decode(value, { stream: true });
          addLog(`[SERIAL] ${text.trim()}`);
        }
      }
    } catch (error) {
      console.warn("Serial read error:", error);
    } finally {
      if (readerRef.current) {
        readerRef.current.releaseLock();
      }
    }
  };

  const toggleSerialMonitor = async () => {
    if (!portRef.current) return;

    if (isMonitorOpen) {
      await closeSerialPort();
      setIsMonitorOpen(false);
      addLog("[COM] 🛑 Serial Monitor 已關閉。");
    } else {
      try {
        await portRef.current.open({ baudRate: 9600 });
        setIsMonitorOpen(true);
        addLog("[COM] 📺 Serial Monitor 已開啟 (Baud: 9600)。");
        readSerialData();
      } catch (e: any) {
        addLog(`[COM] ❌ 開啟 Serial Monitor 失敗: ${e.message}`);
      }
    }
  };

  return {
    isConnected,
    isMonitorOpen,
    portRequestList,
    setPortRequestList,
    connectedPortName,
    setConnectedPortName,
    handleSelectPort,
    toggleSerialMonitor,
    closeSerialPort,
    portRef,
    originalRequestPortRef,
    setIsConnected,
    setIsMonitorOpen
  };
}
