import { useState, useRef, useEffect } from 'react'
import { Terminal, Monitor, Save, Cpu, Zap, Settings, RefreshCw, Plug, Loader2 } from 'lucide-react'

// 給 window.AvrgirlArduino 以及 navigator.serial 加上 TypeScript 型別略過
declare global {
  interface Window {
    AvrgirlArduino: any;
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

  // Web Serial 狀態參照
  const portRef = useRef<any>(null)
  const readerRef = useRef<any>(null)
  const pipeClosedRef = useRef<Promise<void> | null>(null)
  const originalRequestPortRef = useRef<any>(null)
  const terminalBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 儲存原始的 requestPort 供 avrgirl 攔截使用
    if (navigator.serial) {
      originalRequestPortRef.current = navigator.serial.requestPort.bind(navigator.serial)
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
  // API 互動：編譯與安裝
  // =====================================
  const handleSystemInit = async () => {
    addLog("[SYS] ⚡ 正在背景初始化系統並安裝 AVR 核心，這可能需要幾分鐘...")
    try {
      const res = await fetch('/api/system/init')
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        chunk.split('\n').forEach(line => {
          if (line.startsWith('data: ')) {
            const text = line.substring(6)
            if (text !== '[DONE]') addLog(text)
          }
        })
      }
      addLog("[SYS] ✅ 系統初始化完成！")
    } catch (err: any) {
      addLog(`[ERR] 系統初始化失敗: ${err.message}`)
    }
  }

  const handleInstallLib = async () => {
    if (!libSearch) return
    addLog(`[LIB] ⏳ 正在背景下載安裝函式庫: ${libSearch}...`)
    try {
      const res = await fetch('/api/libraries/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libName: libSearch })
      })
      const data = await res.json()
      if (data.success) {
        addLog(`[LIB] ✅ 函式庫 ${libSearch} 安裝成功！`)
      } else {
        addLog(`[ERR] 函式庫安裝失敗: ${data.error}`)
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
      await readerRef.current.cancel()
      await pipeClosedRef.current?.catch(() => {}) // 等待 Pipe 釋放 Lock
      readerRef.current = null
    }
    if (portRef.current) {
      try {
        await portRef.current.close()
      } catch (e) {}
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
    const textDecoder = new TextDecoderStream()
    pipeClosedRef.current = portRef.current.readable.pipeTo(textDecoder.writable)
    readerRef.current = textDecoder.readable.getReader()

    try {
      while (true) {
        const { value, done } = await readerRef.current.read()
        if (done) {
          readerRef.current.releaseLock()
          break
        }
        if (value) {
          addLog(`[SERIAL] ${value.trim()}`)
        }
      }
    } catch (error) {
      console.warn("Serial read error:", error)
    } finally {
      if (readerRef.current) readerRef.current.releaseLock()
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
    }

    setIsCompiling(true)
    addLog("[BUILD] ⏳ 正在將程式碼傳送至後端編譯中...")

    try {
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
        } catch (e) {
          // 若不是 JSON，保留原始 text 作為錯誤訊息
        }
        throw new Error(`HTTP ${response.status}: ${errMsg}`)
      }

      addLog("[BUILD] 🎯 編譯成功！開始背景寫入晶片...")
      const hexBuffer = await response.arrayBuffer()

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
      
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="text-primary w-6 h-6" />
            <h1 className="font-bold text-lg tracking-wide">Antigravity IDE</h1>
          </div>
          <button 
            onClick={handleSystemInit}
            title="系統初始化 (System Init)"
            className="p-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground"
          >
            <Settings className="w-4 h-4" />
          </button>
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
            <textarea 
              className="w-full flex-1 bg-transparent p-4 font-mono text-[14px] leading-relaxed text-[#d4d4d4] resize-none focus:outline-none selection:bg-[#264f78]"
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck="false"
            />
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
