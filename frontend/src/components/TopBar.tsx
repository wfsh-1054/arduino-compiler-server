import { Monitor, Zap, Loader2 } from 'lucide-react';

interface TopBarProps {
  isConnected: boolean;
  isMonitorOpen: boolean;
  isCompiling: boolean;
  toggleSerialMonitor: () => void;
  handleCompileAndFlash: () => void;
}

export function TopBar({
  isConnected,
  isMonitorOpen,
  isCompiling,
  toggleSerialMonitor,
  handleCompileAndFlash
}: TopBarProps) {
  return (
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
  );
}
