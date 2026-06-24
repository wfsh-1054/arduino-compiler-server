/// <reference types="@types/dom-serial" />
import { useState, useRef, useEffect } from 'react'
import { Terminal, Monitor, Cpu, Zap, RefreshCw, Plug, Loader2 } from 'lucide-react'
import Editor from '@monaco-editor/react'

// 給 window.AvrgirlArduino 以及 navigator.serial, makerApi 加上 TypeScript 型別略過
declare global {
  interface Window {
    AvrgirlArduino: any;
    makerApi?: any;
  }
}

function App() {
  const [boardType, setBoardType] = useState('uno')
  const [code, setCode] = useState(`void setup() {\n  Serial.begin(9600);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  Serial.println("LED ON");\n  delay(1000);\n  digitalWrite(13, LOW);\n  Serial.println("LED OFF");\n  delay(1000);\n}`)
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isMonitorOpen, setIsMonitorOpen] = useState(false)
  const [libSearch, setLibSearch] = useState('')
  const [portRequestList, setPortRequestList] = useState<any[] | null>(null)
  const [connectedPortName, setConnectedPortName] = useState<string>('')

  // Web Serial 狀態參照
  const portRef = useRef<any>(null)
  const readerRef = useRef<any>(null)
  const originalRequestPortRef = useRef<any>(null)
  const terminalBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 儲存原始的 requestPort 供 avrgirl 攔截使用
    if (navigator.serial) {
      originalRequestPortRef.current = navigator.serial.requestPort.bind(navigator.serial)
    }

    // 檢查系統核心並在初次開啟時初始化
    const checkAndInitSystem = async () => {
      try {
        setLogs(prev => [...prev, "[SYS] 🔍 檢查編譯環境中..."]);
        
        let platforms;
        if (window.makerApi) {
          // Electron IPC 模式
          const data = await window.makerApi.getInstalledBoards();
          platforms = data?.platforms;
        } else {
          // Web API 模式
          const res = await fetch('/api/boards/installed');
          if (!res.ok) throw new Error(`伺服器狀態 ${res.status}`);
          const data = await res.json();
          platforms = data?.data?.platforms;
        }
        
        // 檢查是否已經安裝 arduino:avr
        const hasAvr = platforms && platforms.some((platform: any) => platform.ID === 'arduino:avr');
        
        if (!hasAvr) {
          setLogs(prev => [...prev, "[SYS] 🚀 偵測到初次啟動，準備在背景下載核心編譯檔案 (首次下載約需數分鐘)..."]);
          
          if (window.makerApi) {
             // Electron IPC 模式監聽進度
             window.makerApi.onProgress((msg: string) => {
               if (msg === '[DONE]') {
                 setLogs(prev => [...prev, "[SYS] 🎉 核心編譯檔案下載與安裝完成！現在可以開始編譯了。"]);
               } else if (msg.startsWith('[ERR]')) {
                 setLogs(prev => [...prev, msg]);
               } else {
                 setLogs(prev => [...prev, `[SYS] ${msg}`]);
               }
             });
             await window.makerApi.initSystem();
          } else {
             // Web Server 模式 (SSE)
             const eventSource = new EventSource('/api/system/init');
             eventSource.onmessage = (e) => {
               if (e.data === '[DONE]') {
                 eventSource.close();
                 setLogs(prev => [...prev, "[SYS] 🎉 核心編譯檔案下載與安裝完成！現在可以開始編譯了。"]);
               } else if (e.data.startsWith('[ERR]')) {
                 setLogs(prev => [...prev, e.data]);
               } else {
                 setLogs(prev => [...prev, `[SYS] ${e.data}`]);
               }
             };
             eventSource.onerror = () => {
               eventSource.close();
               setLogs(prev => [...prev, "[SYS] ❌ 系統初始化連線發生異常，請重試"]);
             };
          }
        } else {
          setLogs(prev => [...prev, "[SYS] ✅ 系統核心已準備就緒，可立即編譯。"]);
        }
      } catch (e: any) {
        setLogs(prev => [...prev, "[ERR] 檢查系統環境發生例外錯誤: " + e.message]);
      }
    };

    checkAndInitSystem();

    // 監聽來自 Electron 的 Serial Port 選擇請求
    if (window.makerApi) {
      window.makerApi.onSerialPortRequest((ports: any[]) => {
        setPortRequestList(ports);
      });
    }
  }, [])

  useEffect(() => {
    // 日誌自動滾動到底部
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg])
  }

  // =====================================
  // Monaco Editor 補全與設定
  // =====================================
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 編輯器載入後自動聚焦，提升使用者體驗
    editor.focus();

    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        const suggestions = [
          {
            label: 'setup',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'void setup() {\n  $0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arduino setup() function',
            range: range
          },
          {
            label: 'loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'void loop() {\n  $0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arduino loop() function',
            range: range
          },
          {
            label: 'pinMode',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'pinMode(${1:pin}, ${2:OUTPUT});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Configures the specified pin to behave either as an input or an output.',
            range: range
          },
          {
            label: 'digitalWrite',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'digitalWrite(${1:pin}, ${2:HIGH});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Write a HIGH or a LOW value to a digital pin.',
            range: range
          },
          {
            label: 'Serial.println',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'Serial.println(${1:"text"});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Prints data to the serial port as human-readable ASCII text followed by a carriage return character.',
            range: range
          },
          {
            label: 'delay',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'delay(${1:1000});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Pauses the program for the amount of time (in milliseconds).',
            range: range
          }
        ];
        return { suggestions };
      }
    });
  };

  // =====================================
  // API 互動：編譯與安裝
  // =====================================
  const handleInstallLib = async () => {
    if (!libSearch) return
    addLog(`[LIB] ⏳ 正在背景下載安裝函式庫: ${libSearch}...`)
    try {
      let success = false, errorMsg = '';
      if (window.makerApi) {
        const res = await window.makerApi.installLibrary(libSearch);
        success = res.success;
        errorMsg = res.error;
      } else {
        const res = await fetch('/api/libraries/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libName: libSearch })
        })
        const data = await res.json()
        success = data.success;
        errorMsg = data.error;
      }

      if (success) {
        addLog(`[LIB] ✅ 函式庫 ${libSearch} 安裝成功！`)
      } else {
        addLog(`[ERR] 函式庫安裝失敗: ${errorMsg}`)
      }
    } catch (e: any) {
      addLog(`[ERR] 發生異常: ${e.message}`)
    }
  }

  // =====================================
  // Serial Port 邏輯
  // =====================================
  const closeSerialPort = async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel()
      } catch (e) {}
      readerRef.current = null
    }
    if (portRef.current) {
      try {
        await portRef.current.close()
      } catch (e: any) {
        console.error("Force close error:", e.message)
      }
    }
  }

  const handleSelectPort = async () => {
    try {
      if (!navigator.serial) {
        addLog("[ERR] ❌ 您的瀏覽器不支援 Web Serial API！請使用 Chrome 或 Edge，並確保在 localhost 或 HTTPS 環境下執行。")
        return
      }

      if (portRef.current) {
        await closeSerialPort()
        setIsConnected(false)
        setIsMonitorOpen(false)
        portRef.current = null
      }
      
      // 直接呼叫原生 API，確保瀏覽器認定這是「使用者點擊事件」
      const port = await navigator.serial.requestPort()
      portRef.current = port
      setIsConnected(true)
      addLog("[COM] ✅ 成功連接至 Arduino 連接埠！")
    } catch (err: any) {
      addLog(`[COM] ❌ 連接失敗或已取消: ${err.message || '未知錯誤'}`)
    }
  }

  const readSerialData = async () => {
    if (!portRef.current) return
    
    // 直接從原生的 readable 取得 reader，避免 pipeTo 造成的卡死問題
    readerRef.current = portRef.current.readable.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { value, done } = await readerRef.current.read()
        if (done) {
          break
        }
        if (value) {
          const text = decoder.decode(value, { stream: true })
          addLog(`[SERIAL] ${text.trim()}`)
        }
      }
    } catch (error) {
      console.warn("Serial read error:", error)
    } finally {
      if (readerRef.current) {
        readerRef.current.releaseLock()
      }
    }
  }

  const toggleSerialMonitor = async () => {
    if (!portRef.current) return

    if (isMonitorOpen) {
      await closeSerialPort()
      setIsMonitorOpen(false)
      addLog("[COM] 🛑 Serial Monitor 已關閉。")
    } else {
      try {
        await portRef.current.open({ baudRate: 9600 })
        setIsMonitorOpen(true)
        addLog("[COM] 📺 Serial Monitor 已開啟 (Baud: 9600)。")
        readSerialData()
      } catch (e: any) {
        addLog(`[COM] ❌ 開啟 Serial Monitor 失敗: ${e.message}`)
      }
    }
  }

  // =====================================
  // 編譯與燒錄邏輯
  // =====================================
  const handleCompileAndFlash = async () => {
    if (!portRef.current) {
      addLog("[ERR] 請先選擇連接埠！")
      return
    }

    // 燒錄前先中斷監聽器，釋放 COM port
    if (isMonitorOpen) {
      addLog("[SYS] 暫停 Serial Monitor 以進行燒錄...")
      await closeSerialPort()
      setIsMonitorOpen(false)
      
      // 在 Windows 環境下，關閉 COM Port 到底層釋放 Handle 通常需要一點時間
      // 加入 1.5 秒的延遲，確保 arduino-cli 能夠成功取得 Port 的控制權
      await new Promise(resolve => setTimeout(resolve, 1500))
    } else {
      // 🐛 [修復 Windows CH340 驅動程式未初始化 Bug]
      // 如果使用者沒開過 Monitor 就直接燒錄，某些低價晶片 (CH340) 的驅動程式狀態會是空的，
      // 這會導致底層的 arduino-cli 報錯 `cannot set com-state`。
      // 解法：我們用 Web Serial API 短暫地打開再關閉它，強制喚醒並初始化作業系統的 Port 狀態。
      if (portRef.current) {
        try {
          await portRef.current.open({ baudRate: 9600 })
          await portRef.current.close()
          await new Promise(resolve => setTimeout(resolve, 800)) // 等待系統釋放
        } catch (e) {
          // 如果出錯就忽略，代表可能已經有其他狀態了
        }
      }
    }

    setIsCompiling(true)
    addLog("[BUILD] ⏳ 正在將程式碼傳送至後端編譯中...")

    try {
      let hexBuffer: ArrayBuffer;
      
      if (window.makerApi) {
         // Electron IPC 模式
         const res = await window.makerApi.compile(code, boardType);
        if (!res.success) throw new Error(res.error);
        
        // 將主進程傳來的陣列轉回 ArrayBuffer
        hexBuffer = new Uint8Array(res.fileBuffer).buffer;

        addLog(`[BUILD] 🎯 編譯成功！開始將韌體燒錄至 ${connectedPortName}...`);

        // 在 Electron 模式下，直接使用後端的原生 arduino-cli upload 進行燒錄！
        // 速度極快且 100% 穩定，完全避開 Web Serial API 的卡 Port 問題。
        const uploadRes = await window.makerApi.upload(res.fileBuffer, boardType, connectedPortName, res.ext);
        setIsCompiling(false);

        if (!uploadRes.success) {
          throw new Error(uploadRes.error);
        }

        addLog("[FLASH] 🎉 程式已自動由原生引擎燒錄完成！您可以再次開啟 Monitor 查看輸出。");
        return; // 結束，不往下執行 avrgirl
      } else {
         // Web 模式
         const response = await fetch('/api/compile', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ boardType, code })
         })
         if (!response.ok) {
           const errText = await response.text()
           let errMsg = errText || "伺服器無回應或發生未知錯誤"
           try {
             const errJson = JSON.parse(errText)
             if (errJson.error) errMsg = errJson.error
           } catch (e) { }
           throw new Error(`HTTP ${response.status}: ${errMsg}`)
         }
         hexBuffer = await response.arrayBuffer();
      }

      addLog("[BUILD] 🎯 編譯成功！開始背景寫入晶片...")

      // 劫持 requestPort 讓 avrgirl 直接使用我們已經選好的 port
      navigator.serial.requestPort = async () => portRef.current
      
      const avrgirl = new window.AvrgirlArduino({ board: 'uno', debug: false })
      
      avrgirl.flash(hexBuffer, (err: any) => {
        navigator.serial.requestPort = originalRequestPortRef.current
        setIsCompiling(false)
        if (err) {
          addLog(`[ERR] ❌ 燒錄失敗: ${err.message}`)
        } else {
          addLog("[FLASH] 🎉 程式已自動燒錄完成！您可以再次開啟 Monitor 查看輸出。")
        }
      })
    } catch (error: any) {
      navigator.serial.requestPort = originalRequestPortRef.current
      setIsCompiling(false)
      addLog(`[ERR] ❌ 錯誤: ${error.message}`)
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* Port Selection Modal */}
      {portRequestList && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border p-6 rounded-xl shadow-2xl w-96 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plug className="w-5 h-5 text-primary" /> Select a Serial Port
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {portRequestList.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 text-center">No ports found. Please connect your device.</div>
              ) : (
                portRequestList.map(port => (
                  <button
                    key={port.portId}
                    onClick={() => {
                      window.makerApi.selectSerialPort(port.portId);
                      setConnectedPortName(port.portName || '');
                      setPortRequestList(null);
                    }}
                    className="w-full text-left px-4 py-3 bg-input/50 hover:bg-primary/20 hover:border-primary/50 border border-border rounded-lg transition-all text-sm group"
                  >
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{port.displayName || 'Serial Device'}</span>
                      <span className="text-xs font-mono text-muted-foreground group-hover:text-primary/70 bg-background/50 px-2 py-0.5 rounded">
                        {port.portName || `ID: ${port.portId}`}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => {
                  window.makerApi.cancelSerialPort();
                  setPortRequestList(null);
                }}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="text-primary w-6 h-6" />
            <h1 className="font-bold text-lg tracking-wide">Maker IDE</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Board
            </h2>
            <select 
              className="w-full bg-input border border-border rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              value={boardType}
              onChange={e => setBoardType(e.target.value)}
            >
              <option value="uno">Arduino Uno (avr)</option>
              <option value="esp32">ESP32 (esp32)</option>
            </select>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Libraries</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search library..." 
                value={libSearch}
                onChange={e => setLibSearch(e.target.value)}
                className="w-full bg-input border border-border rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              />
              <button 
                onClick={handleInstallLib}
                className="bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-md transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Connection</h2>
            <button 
              className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-md transition-all font-medium shadow-sm ${
                isConnected 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-transparent'
              }`}
              onClick={handleSelectPort}
            >
              <Plug className="w-4 h-4" />
              {isConnected ? 'Port Selected' : 'Select Serial Port'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-muted/20">
        {/* Top Bar */}
        <div className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shadow-sm transition-colors duration-500 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {isConnected ? 'Ready' : 'Disconnected'}
            </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={toggleSerialMonitor}
              disabled={!isConnected || isCompiling}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isMonitorOpen
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Monitor className="w-4 h-4" /> {isMonitorOpen ? 'Close Monitor' : 'Open Monitor'}
            </button>

            <button 
              onClick={handleCompileAndFlash}
              disabled={!isConnected || isCompiling}
              className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-bold transition-all ${
                isConnected && !isCompiling
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(2,132,199,0.4)] hover:shadow-[0_0_20px_rgba(2,132,199,0.6)]' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isCompiling ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Compiling...</>
              ) : (
                <><Zap className="w-4 h-4 fill-current" /> Compile & Flash</>
              )}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 border border-border rounded-xl bg-[#1e1e1e] overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-lg flex flex-col">
            <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-4 gap-2">
               <div className="flex gap-1.5">
                 <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                 <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                 <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
               </div>
               <span className="text-xs text-gray-400 font-mono ml-4">sketch.ino</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="cpp"
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'Courier New', Consolas, monospace",
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  formatOnPaste: true,
                  padding: { top: 16 }
                }}
              />
            </div>
          </div>

          {/* Terminal */}
          <div className="h-56 border border-border rounded-xl bg-[#1e1e1e] overflow-hidden flex flex-col shadow-lg">
            <div className="h-9 border-b border-[#333] bg-[#252526] flex items-center px-4 justify-between">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-2 tracking-wide">
                <Terminal className="w-3.5 h-3.5" /> TERMINAL
              </span>
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Clear
              </button>
            </div>
            <div className="flex-1 p-4 font-mono text-[13px] overflow-y-auto text-emerald-400 leading-relaxed bg-[#0d0d0d]">
              {logs.length === 0 ? (
                <span className="text-gray-600 italic">System ready. Waiting for commands...</span>
              ) : (
                logs.map((log, i) => <div key={i} className="break-all">{log}</div>)
              )}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
