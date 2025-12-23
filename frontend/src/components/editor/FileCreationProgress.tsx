// frontend/src/components/editor/FileCreationProgress.tsx
// Live file creation progress display (like bolt.diy)

import { useState } from 'react';
import { Check, FileCode, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface FileCreationProgressProps {
  files: Record<string, string>;  // path -> content
  isGenerating: boolean;
  title?: string;
}

// Get file icon color based on extension
function getFileColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jsx':
    case 'tsx':
      return 'text-blue-400';
    case 'js':
    case 'ts':
      return 'text-yellow-400';
    case 'css':
      return 'text-pink-400';
    case 'json':
      return 'text-green-400';
    case 'html':
      return 'text-orange-400';
    case 'md':
      return 'text-slate-400';
    default:
      return 'text-slate-300';
  }
}

export function FileCreationProgress({ files, isGenerating, title }: FileCreationProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const fileList = Object.keys(files);
  
  if (fileList.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <div className="bg-slate-800/70 rounded-lg border border-slate-700 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        
        {isGenerating ? (
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
        ) : (
          <Check className="h-4 w-4 text-green-400" />
        )}
        
        <span className="text-sm font-medium text-slate-200">
          {title || 'Generated Files'}
        </span>
        
        <span className="ml-auto text-xs text-slate-500">
          {fileList.length} file{fileList.length !== 1 ? 's' : ''}
        </span>
      </button>
      
      {/* File List */}
      {isExpanded && (
        <div className="border-t border-slate-700 max-h-48 overflow-y-auto">
          {fileList.length === 0 && isGenerating ? (
            <div className="px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for files...
            </div>
          ) : (
            <ul className="py-1">
              {fileList.map((filePath, index) => (
                <li
                  key={filePath}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700/30 transition-colors"
                  style={{
                    animation: 'fadeIn 0.3s ease-out',
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  <FileCode className={`h-3.5 w-3.5 flex-shrink-0 ${getFileColor(filePath)}`} />
                  <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300 truncate">
                    <span className="text-slate-500">Create </span>
                    <span className={getFileColor(filePath)}>{filePath}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* CSS for animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
