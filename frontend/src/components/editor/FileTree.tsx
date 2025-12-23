// frontend/src/components/editor/FileTree.tsx
// VS Code-like file tree with folders and file selection

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  FileType,
  File,
} from 'lucide-react';

interface FileTreeProps {
  files: Record<string, string>;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

// Get appropriate icon based on file extension
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'jsx':
    case 'tsx':
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case 'js':
    case 'ts':
      return <FileCode className="h-4 w-4 text-yellow-400" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-500" />;
    case 'css':
      return <FileType className="h-4 w-4 text-blue-500" />;
    case 'html':
      return <FileText className="h-4 w-4 text-orange-500" />;
    case 'md':
      return <FileText className="h-4 w-4 text-gray-400" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
}

// Build tree structure from flat file paths
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

function buildTree(files: Record<string, string>): TreeNode[] {
  const root: Record<string, any> = {};

  Object.keys(files).forEach((filePath) => {
    const parts = filePath.replace(/^\//, '').split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          __isFolder: index < parts.length - 1,
          __path: parts.slice(0, index + 1).join('/'),
        };
      }
      if (index < parts.length - 1) {
        current = current[part];
      }
    });
  });

  function convertToTree(obj: Record<string, any>, parentPath = ''): TreeNode[] {
    const nodes: TreeNode[] = [];
    const entries = Object.entries(obj).filter(([key]) => !key.startsWith('__'));

    // Sort: folders first, then files, alphabetically
    entries.sort(([a, aVal], [b, bVal]) => {
      const aIsFolder = aVal.__isFolder;
      const bIsFolder = bVal.__isFolder;
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.localeCompare(b);
    });

    for (const [name, value] of entries) {
      const path = parentPath ? `${parentPath}/${name}` : name;
      const isFolder = value.__isFolder;

      if (isFolder) {
        nodes.push({
          name,
          path,
          type: 'folder',
          children: convertToTree(value, path),
        });
      } else {
        nodes.push({
          name,
          path,
          type: 'file',
        });
      }
    }

    return nodes;
  }

  return convertToTree(root);
}

// Recursive tree node component
function TreeNodeItem({
  node,
  level,
  selectedFile,
  onSelectFile,
  expandedFolders,
  onToggleFolder,
}: {
  node: TreeNode;
  level: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  const paddingLeft = level * 12 + 8;

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 py-1 px-2 hover:bg-gray-700/50 cursor-pointer rounded"
          style={{ paddingLeft }}
          onClick={() => onToggleFolder(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          )}
          <span className="text-sm text-gray-200 truncate">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <div
      className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded ${
        isSelected
          ? 'bg-blue-600/30 text-white'
          : 'hover:bg-gray-700/50 text-gray-300'
      }`}
      style={{ paddingLeft: paddingLeft + 18 }} // Extra indent for files (no chevron)
      onClick={() => onSelectFile(node.path)}
    >
      {getFileIcon(node.name)}
      <span className="text-sm truncate">{node.name}</span>
    </div>
  );
}

export default function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['src', 'src/components']) // Default expanded
  );

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Explorer
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-1">
        {tree.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            No files yet
          </div>
        ) : (
          tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              level={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-700 flex-shrink-0">
        <span className="text-xs text-gray-500">
          {Object.keys(files).length} files
        </span>
      </div>
    </div>
  );
}
