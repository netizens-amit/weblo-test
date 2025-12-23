// frontend/src/components/editor/FileTabs.tsx
// Tab bar for open files with close buttons and unsaved indicators

import { X } from 'lucide-react';

interface FileTabsProps {
  openFiles: string[];
  activeFile: string | null;
  unsavedFiles: Set<string>;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jsx':
    case 'tsx':
      return '⚛️';
    case 'js':
    case 'ts':
      return '📜';
    case 'json':
      return '📦';
    case 'css':
      return '🎨';
    case 'html':
      return '🌐';
    default:
      return '📄';
  }
}

export default function FileTabs({
  openFiles,
  activeFile,
  unsavedFiles,
  onSelectTab,
  onCloseTab,
}: FileTabsProps) {
  if (openFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto flex-shrink-0">
      {openFiles.map((filePath) => {
        const isActive = filePath === activeFile;
        const isUnsaved = unsavedFiles.has(filePath);
        const fileName = getFileName(filePath);
        const icon = getFileIcon(fileName);

        return (
          <div
            key={filePath}
            className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-gray-700 min-w-0 ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200'
            }`}
            onClick={() => onSelectTab(filePath)}
          >
            <span className="text-sm flex-shrink-0">{icon}</span>
            <span className="text-sm truncate max-w-32">{fileName}</span>
            {isUnsaved && (
              <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
            )}
            <button
              className={`flex-shrink-0 p-0.5 rounded hover:bg-gray-600 ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(filePath);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
