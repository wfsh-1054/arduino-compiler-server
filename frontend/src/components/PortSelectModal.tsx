import { Plug } from 'lucide-react';

interface PortSelectModalProps {
  portRequestList: any[];
  setPortRequestList: (val: any[] | null) => void;
  setConnectedPortName: (val: string) => void;
}

export function PortSelectModal({
  portRequestList,
  setPortRequestList,
  setConnectedPortName
}: PortSelectModalProps) {
  return (
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
                  if (window.makerApi) window.makerApi.selectSerialPort(port.portId);
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
              if (window.makerApi) window.makerApi.cancelSerialPort();
              setPortRequestList(null);
            }}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
