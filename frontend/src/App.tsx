/// <reference types="@types/dom-serial" />
import { useState, useRef, useEffect } from 'react';
import { api } from './api/makerApi';
import { useSerial } from './hooks/useSerial';
import { useCompiler } from './hooks/useCompiler';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MenuBar } from './components/MenuBar';
import { CodeEditor } from './components/CodeEditor';
import { TerminalPanel } from './components/TerminalPanel';
import { PortSelectModal } from './components/PortSelectModal';

// 給 window.AvrgirlArduino 以及 navigator.serial, makerApi 加上 TypeScript 型別略過
declare global {
  interface Window {
    AvrgirlArduino: any;
    makerApi?: any;
  }
}

function App() {
  const [boardType, setBoardType] = useState('uno');
  const [code, setCode] = useState(`void setup() {\n  Serial.begin(9600);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  Serial.println("LED ON");\n  delay(1000);\n  digitalWrite(13, LOW);\n  Serial.println("LED OFF");\n  delay(1000);\n}`);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [libSearch, setLibSearch] = useState('');

  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const {
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
    setIsMonitorOpen
  } = useSerial(addLog);

  const { isCompiling, handleCompileAndFlash } = useCompiler(addLog);

  useEffect(() => {
    // 檢查系統核心並在初次開啟時初始化
    const checkAndInitSystem = async () => {
      try {
        setLogs(prev => [...prev, "[SYS] 🔍 檢查編譯環境中..."]);
        
        const data = await api.getInstalledBoards();
        const platforms = data?.platforms;
        
        // 檢查是否已經安裝 arduino:avr
        const hasAvr = platforms && platforms.some((platform: any) => platform.ID === 'arduino:avr');
        
        if (!hasAvr) {
          setLogs(prev => [...prev, "[SYS] 🚀 偵測到初次啟動，準備在背景下載核心編譯檔案 (首次下載約需數分鐘)..."]);
          await api.initSystem((msg: string) => {
             if (msg.startsWith('[ERR]')) {
               setLogs(prev => [...prev, msg]);
             } else {
               setLogs(prev => [...prev, `[SYS] ${msg}`]);
             }
          });
          setLogs(prev => [...prev, "[SYS] 🎉 核心編譯檔案下載與安裝完成！現在可以開始編譯了。"]);
        } else {
          setLogs(prev => [...prev, "[SYS] ✅ 系統核心已準備就緒，可立即編譯。"]);
        }
      } catch (e: any) {
        setLogs(prev => [...prev, "[ERR] 檢查系統環境發生例外錯誤: " + e.message]);
      }
    };

    checkAndInitSystem();
  }, []);

  useEffect(() => {
    // 日誌自動滾動到底部
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleInstallLib = async () => {
    if (!libSearch) return;
    addLog(`[LIB] ⏳ 正在背景下載安裝函式庫: ${libSearch}...`);
    try {
      const res = await api.installLibrary(libSearch);
      if (res.success) {
        addLog(`[LIB] ✅ 函式庫 ${libSearch} 安裝成功！`);
      } else {
        addLog(`[ERR] 函式庫安裝失敗: ${res.error}`);
      }
    } catch (e: any) {
      addLog(`[ERR] 發生異常: ${e.message}`);
    }
  };

  const onCompileAndFlash = () => {
    handleCompileAndFlash(
      code,
      boardType,
      portRef,
      isMonitorOpen,
      closeSerialPort,
      setIsMonitorOpen,
      connectedPortName,
      originalRequestPortRef
    );
  };

  const handleNewProject = () => {
    setCode(`void setup() {\n  \n}\n\nvoid loop() {\n  \n}`);
    setProjectPath(null);
    addLog('[SYS] 📄 已建立空白專案');
  };

  const handleSave = async () => {
    try {
      if (window.makerApi && projectPath) {
        // Desktop 模式且已經有路徑，直接無聲覆寫
        await api.saveCodeDirect(code, projectPath);
        addLog('[SYS] 💾 專案已儲存');
      } else {
        // 沒有路徑或 Web 模式，呼叫另存新檔
        await handleSaveAs();
      }
    } catch (e: any) {
      addLog(`[ERR] 存檔失敗: ${e.message}`);
    }
  };

  const handleSaveAs = async () => {
    try {
      const savedPath = await api.saveCodeAs(code);
      if (savedPath) {
        setProjectPath(savedPath); // 更新當前專案路徑
        addLog(`[SYS] 💾 專案已另存至: ${savedPath}`);
      } else if (savedPath === undefined) {
        // Web 版的 saveCodeAs 回傳 undefined 但會觸發下載
        addLog('[SYS] 💾 程式碼已下載儲存');
      }
    } catch (e: any) {
      addLog(`[ERR] 另存新檔失敗: ${e.message}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAs();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, projectPath]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <MenuBar onNewProject={handleNewProject} onSave={handleSave} onSaveAs={handleSaveAs} />
      <div className="flex-1 flex overflow-hidden">
        {/* Port Selection Modal */}
      {portRequestList && (
        <PortSelectModal 
          portRequestList={portRequestList}
          setPortRequestList={setPortRequestList}
          setConnectedPortName={setConnectedPortName}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        boardType={boardType}
        setBoardType={setBoardType}
        libSearch={libSearch}
        setLibSearch={setLibSearch}
        handleInstallLib={handleInstallLib}
        isConnected={isConnected}
        handleSelectPort={handleSelectPort}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-muted/20">
        
        {/* Top Bar */}
        <TopBar 
          isConnected={isConnected}
          isMonitorOpen={isMonitorOpen}
          isCompiling={isCompiling}
          toggleSerialMonitor={toggleSerialMonitor}
          handleCompileAndFlash={onCompileAndFlash}
        />

        {/* Editor Area */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
          <CodeEditor code={code} setCode={setCode} />
          <TerminalPanel logs={logs} setLogs={setLogs} terminalBottomRef={terminalBottomRef} />
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;
