import { useState, useRef, useEffect } from 'react';
import { Save, FolderOpen, Settings } from 'lucide-react';

interface MenuBarProps {
  onSave: () => void;
}

export function MenuBar({ onSave }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleAction = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  return (
    <div 
      className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 text-sm text-zinc-300 select-none z-50 relative"
      ref={menuRef}
    >
      {/* File Menu */}
      <div className="relative">
        <button 
          className={`px-3 py-1 rounded hover:bg-zinc-800 transition-colors ${activeMenu === 'File' ? 'bg-zinc-800 text-white' : ''}`}
          onClick={() => toggleMenu('File')}
        >
          File
        </button>
        
        {activeMenu === 'File' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded shadow-xl py-1 z-50">
            <button 
              className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 group transition-colors"
              onClick={() => handleAction(onSave)}
            >
              <Save className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>Save As...</span>
              <span className="ml-auto text-xs text-zinc-500 group-hover:text-zinc-300">Ctrl+S</span>
            </button>
            <div className="h-px bg-zinc-800 my-1"></div>
            <button 
              className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 group transition-colors opacity-50 cursor-not-allowed"
              title="Coming soon"
            >
              <FolderOpen className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>Open Folder</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Menu (Placeholder) */}
      <div className="relative">
        <button 
          className={`px-3 py-1 rounded hover:bg-zinc-800 transition-colors ${activeMenu === 'Edit' ? 'bg-zinc-800 text-white' : ''}`}
          onClick={() => toggleMenu('Edit')}
        >
          Edit
        </button>
        {activeMenu === 'Edit' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded shadow-xl py-1 z-50">
             <div className="px-4 py-2 text-zinc-500 italic text-xs">Features coming soon...</div>
          </div>
        )}
      </div>

      {/* View Menu (Placeholder) */}
      <div className="relative">
        <button 
          className={`px-3 py-1 rounded hover:bg-zinc-800 transition-colors ${activeMenu === 'View' ? 'bg-zinc-800 text-white' : ''}`}
          onClick={() => toggleMenu('View')}
        >
          View
        </button>
        {activeMenu === 'View' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded shadow-xl py-1 z-50">
             <button 
              className="w-full text-left px-4 py-2 hover:bg-blue-600 hover:text-white flex items-center gap-2 group transition-colors opacity-50 cursor-not-allowed"
            >
              <Settings className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
