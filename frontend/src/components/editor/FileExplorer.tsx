import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileCode, 
  FileJson, 
  FileText, 
  Folder, 
  ChevronRight,
  ChevronDown 
} from "lucide-react";
import { useState } from "react";

interface FileExplorerProps {
  files: Array<{ path: string; content: string; language: string }>;
}

export function FileExplorer({ files }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src"]));

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".json")) return <FileJson className="h-4 w-4 text-yellow-500" />;
    if (filename.endsWith(".ts") || filename.endsWith(".tsx")) return <FileCode className="h-4 w-4 text-blue-500" />;
    if (filename.endsWith(".js") || filename.endsWith(".jsx")) return <FileCode className="h-4 w-4 text-yellow-500" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  // Organize files into folder structure
  const folderStructure: any = {};
  files.forEach(file => {
    const parts = file.path.split("/").filter(Boolean);
    let current = folderStructure;
    
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        // It's a file
        if (!current._files) current._files = [];
        current._files.push({ name: part, ...file });
      } else {
        // It's a folder
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });

  const renderFolder = (name: string, content: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(name);
    const hasFiles = content._files && content._files.length > 0;

    return (
      <div key={name}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-slate-800 cursor-pointer rounded"
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => toggleFolder(name)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <Folder className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">{name}</span>
        </div>

        {isExpanded && (
          <>
            {Object.keys(content)
              .filter(k => k !== "_files")
              .map(folderName => renderFolder(folderName, content[folderName], level + 1))}
            
            {hasFiles && content._files.map((file: any) => (
              <div
                key={file.path}
                className="flex items-center gap-2 py-2 px-3 hover:bg-slate-800 cursor-pointer rounded"
                style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
              >
                {getFileIcon(file.name)}
                <span className="text-sm text-slate-300">{file.name}</span>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-900">
      <div className="p-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">Project Files</h3>
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-2">
          {Object.keys(folderStructure).map(folderName =>
            renderFolder(folderName, folderStructure[folderName])
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
