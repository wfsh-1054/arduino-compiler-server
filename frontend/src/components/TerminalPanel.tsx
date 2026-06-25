import { Terminal } from 'lucide-react';
import type { RefObject } from 'react';

interface TerminalPanelProps {
  logs: string[];
  setLogs: (logs: string[]) => void;
  terminalBottomRef: RefObject<HTMLDivElement | null>;
}

export function TerminalPanel({ logs, setLogs, terminalBottomRef }: TerminalPanelProps) {
  return (
    <div className="h-56 border border-border rounded-xl bg-[#1e1e1e] overflow-hidden flex flex-col shadow-lg">
      <div className="h-9 border-b border-[#333] bg-[#252526] flex items-center px-4 justify-between">
        <span className="text-xs font-semibold text-gray-400 flex items-center gap-2 tracking-wide">
          <Terminal className="w-3.5 h-3.5" /> TERMINAL
        </span>
        <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Clear
        </button>
      </div>
      <div className="flex-1 p-4 font-mono text-[13px] overflow-y-auto text-emerald-400 leading-relaxed bg-[#0d0d0d] select-text">
        {logs.length === 0 ? (
          <span className="text-gray-600 italic">System ready. Waiting for commands...</span>
        ) : (
          logs.map((log, i) => <div key={i} className="break-all">{log}</div>)
        )}
        <div ref={terminalBottomRef} />
      </div>
    </div>
  );
}
