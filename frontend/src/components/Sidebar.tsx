import { Cpu, Plug, RefreshCw } from 'lucide-react';

interface SidebarProps {
  boardType: string;
  setBoardType: (val: string) => void;
  libSearch: string;
  setLibSearch: (val: string) => void;
  handleInstallLib: () => void;
  isConnected: boolean;
  handleSelectPort: () => void;
}

export function Sidebar({
  boardType,
  setBoardType,
  libSearch,
  setLibSearch,
  handleInstallLib,
  isConnected,
  handleSelectPort
}: SidebarProps) {
  return (
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
  );
}
