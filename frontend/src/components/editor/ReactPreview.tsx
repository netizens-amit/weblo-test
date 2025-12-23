// frontend/src/components/editor/ReactPreview.tsx (WIDTH FIX)

import { useState, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { Save, Code, Eye, Columns2, RefreshCw, FileCode } from 'lucide-react';

interface ReactPreviewProps {
  files: Record<string, string>;
  title?: string;
  onSave: () => void;
  onCodeChange: (filename: string, content: string) => void;
  isSaving: boolean;
  isDirty: boolean;
}

export default function ReactPreview({
  files,
  title,
  onSave,
  onCodeChange: _onCodeChange,
  isSaving,
  isDirty,
}: ReactPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  const [refreshKey, setRefreshKey] = useState(0);

  // 📁 FORMAT FILES FOR SANDPACK
  const sandpackFiles = useMemo(() => {
    const formatted: Record<string, { code: string; active?: boolean }> = {};

    Object.entries(files).forEach(([path, content]) => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      formatted[normalizedPath] = {
        code: content || '// Empty file',
        active: normalizedPath === '/src/App.jsx',
      };
    });

    // Ensure minimum required files
    if (!formatted['/src/App.jsx']) {
      formatted['/src/App.jsx'] = {
        code: `export default function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your React App
        </h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}`,
        active: true,
      };
    }

    return formatted;
  }, [files]);

  // 📦 EXTRACT DEPENDENCIES
  const dependencies = useMemo(() => {
    try {
      const pkgJson = JSON.parse(files['package.json'] || '{}');
      return pkgJson.dependencies || {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        'lucide-react': '^0.263.1',
      };
    } catch {
      return {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        'lucide-react': '^0.263.1',
      };
    }
  }, [files]);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gray-900 font-semibold text-base">{title || 'Preview'}</span>
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewMode('preview')}
            className={`h-8 px-3 ${
              viewMode === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewMode('code')}
            className={`h-8 px-3 ${
              viewMode === 'code' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            <Code className="h-4 w-4 mr-1.5" />
            Code
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewMode('split')}
            className={`h-8 px-3 ${
              viewMode === 'split' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            <Columns2 className="h-4 w-4 mr-1.5" />
            Split
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleRefresh} className="h-8 px-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="h-8 bg-gray-900 text-white hover:bg-gray-800"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ✅ SANDPACK CONTAINER - FIXED WIDTH */}
      <div className="flex-1 overflow-hidden w-full">
        {Object.keys(sandpackFiles).length > 0 ? (
          <SandpackProvider
            key={refreshKey}
            template="react"
            files={sandpackFiles}
            customSetup={{
              dependencies,
              entry: '/src/main.jsx',
            }}
            theme="light"
            options={{
              externalResources: ['https://cdn.tailwindcss.com'],
              autorun: true,
              autoReload: true,
            }}
          >
            {/* ✅ KEY FIX: Add inline style with width: 100% */}
            <SandpackLayout 
              style={{ 
                height: '100%', 
                width: '100%',  // ✅ CRITICAL FIX
                border: 'none',
                display: 'flex'
              }}
            >
              {/* FILE EXPLORER */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div style={{ width: '200px', flexShrink: 0 }}>
                  <SandpackFileExplorer />
                </div>
              )}

              {/* CODE EDITOR */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div
                  style={{
                    flex: viewMode === 'split' ? 1 : 2,
                    height: '100%',
                    width: viewMode === 'split' ? '50%' : '100%', // ✅ EXPLICIT WIDTH
                    overflow: 'hidden',
                  }}
                >
                  <SandpackCodeEditor
                    showTabs
                    showLineNumbers
                    showInlineErrors
                    wrapContent
                    closableTabs
                    style={{ height: '100%', width: '100%' }} // ✅ EXPLICIT WIDTH
                  />
                </div>
              )}

              {/* PREVIEW */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div
                  style={{
                    flex: viewMode === 'split' ? 1 : 2,
                    height: '100%',
                    width: viewMode === 'split' ? '50%' : '100%', // ✅ EXPLICIT WIDTH
                    overflow: 'hidden',
                  }}
                >
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={true}
                    showNavigator={false}
                    style={{
                      height: '100%',
                      width: '100%', // ✅ EXPLICIT WIDTH
                      border: 'none',
                    }}
                  />
                </div>
              )}
            </SandpackLayout>
          </SandpackProvider>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <FileCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No files generated yet</p>
              <p className="text-sm text-gray-400 mt-2">Waiting for code generation...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}