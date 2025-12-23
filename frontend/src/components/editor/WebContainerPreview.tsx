// frontend/src/components/editor/WebContainerPreview.tsx
// WebContainer-based preview with full Node.js/Vite support

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Save,
  Code,
  Eye,
  Columns2,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  Rocket,
  FileCode,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
} from 'lucide-react';
import { useWebContainer } from '@/hooks/useWebContainer';
import type { WebContainerStatus } from '@/hooks/useWebContainer';
import FileTree from './FileTree';
import FileTabs from './FileTabs';
import CodeEditor from './CodeEditor';

// Device presets for responsive preview
const DEVICE_PRESETS = [
  { id: 'responsive', name: 'Responsive', width: '100%', height: '100%', icon: Maximize2 },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: Smartphone },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, icon: Smartphone },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: Smartphone },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915, icon: Smartphone },
  { id: 'samsung-s21', name: 'Samsung S21', width: 360, height: 800, icon: Smartphone },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: Tablet },
  { id: 'ipad-pro', name: 'iPad Pro 12.9"', width: 1024, height: 1366, icon: Tablet },
  { id: 'surface-pro', name: 'Surface Pro 7', width: 912, height: 1368, icon: Tablet },
  { id: 'laptop', name: 'Laptop', width: 1366, height: 768, icon: Monitor },
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: Monitor },
] as const;

type DeviceId = typeof DEVICE_PRESETS[number]['id'];

interface WebContainerPreviewProps {
  files: Record<string, string>;
  title?: string;
  onSave: () => void;
  onCodeChange: (filename: string, content: string) => void;
  isSaving: boolean;
  isDirty: boolean;
  isRefining?: boolean;  // Show skeleton loading during refinement
}

// Status indicator component
function StatusIndicator({ status }: { status: WebContainerStatus }) {
  const getStatusIcon = () => {
    switch (status.phase) {
      case 'booting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'mounting':
        return <FileCode className="h-4 w-4 text-blue-500" />;
      case 'installing':
        return <Package className="h-4 w-4 text-amber-500" />;
      case 'starting':
        return <Rocket className="h-4 w-4 text-purple-500" />;
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status.phase) {
      case 'ready':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'installing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span>{status.message}</span>
      {status.progress !== undefined && status.progress > 0 && (
        <span className="text-xs opacity-70">({status.progress}%)</span>
      )}
    </div>
  );
}

// Terminal output component
function TerminalPanel({
  output,
  isExpanded,
  onToggle,
}: {
  output: string[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current && isExpanded) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, isExpanded]);

  return (
    <div className="border-t border-gray-200 bg-gray-900">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal</span>
          <span className="text-xs text-gray-500">({output.length} lines)</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div
          ref={terminalRef}
          className="h-40 overflow-auto p-4 font-mono text-xs text-gray-300 bg-gray-950"
        >
          {output.length === 0 ? (
            <div className="text-gray-500">Waiting for output...</div>
          ) : (
            output.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Skeleton loading screen with shimmer effect (v0 style)
function LoadingScreen({ status }: { status: WebContainerStatus }) {
  return (
    <div className="h-full w-full bg-white overflow-hidden relative">
      {/* Shimmer overlay animation */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent z-10" />

      {/* Skeleton Website Layout */}
      <div className="h-full flex flex-col">
        {/* Header Skeleton */}
        <div className="h-16 border-b border-gray-100 px-6 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
            <div className="w-24 h-4 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-20 h-8 rounded-lg bg-gray-200 animate-pulse" />
          </div>
        </div>

        {/* Hero Section Skeleton */}
        <div className="flex-1 overflow-hidden">
          <div className="h-96 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-8">
            <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12">
              {/* Hero Text */}
              <div className="flex-1 space-y-4">
                <div className="w-3/4 h-8 rounded-lg bg-gray-200 animate-pulse" />
                <div className="w-full h-6 rounded bg-gray-200 animate-pulse" />
                <div className="w-2/3 h-6 rounded bg-gray-200 animate-pulse" />
                <div className="pt-4 flex gap-3">
                  <div className="w-32 h-10 rounded-lg bg-gray-300 animate-pulse" />
                  <div className="w-28 h-10 rounded-lg bg-gray-200 animate-pulse" />
                </div>
              </div>
              {/* Hero Image */}
              <div className="w-80 h-64 rounded-2xl bg-gray-200 animate-pulse" />
            </div>
          </div>

          {/* Features Section Skeleton */}
          <div className="py-16 px-8 bg-white">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-48 h-6 rounded bg-gray-200 animate-pulse mx-auto mb-3" />
                <div className="w-72 h-4 rounded bg-gray-100 animate-pulse mx-auto" />
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse mb-4" />
                    <div className="w-24 h-5 rounded bg-gray-200 animate-pulse mb-2" />
                    <div className="w-full h-3 rounded bg-gray-100 animate-pulse mb-1" />
                    <div className="w-3/4 h-3 rounded bg-gray-100 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Skeleton */}
          <div className="h-20 border-t border-gray-100 bg-gray-50/50 flex items-center justify-center">
            <div className="flex gap-8">
              <div className="w-20 h-3 rounded bg-gray-200 animate-pulse" />
              <div className="w-20 h-3 rounded bg-gray-200 animate-pulse" />
              <div className="w-20 h-3 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow-lg border border-gray-200 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">{status.message}</span>
        </div>
      </div>
    </div>
  );
}

// Error screen component
function ErrorScreen({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-red-50 p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to Start Environment
        </h2>
        <p className="text-gray-600 text-sm mb-6">{error.message}</p>
        <Button onClick={onRetry} className="bg-red-600 hover:bg-red-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}

// Main component
export default function WebContainerPreview({
  files,
  title,
  onSave,
  onCodeChange,
  isSaving,
  isDirty,
  isRefining = false,
}: WebContainerPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  const [showTerminal, setShowTerminal] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceId>('responsive');
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  // VS Code-like editor state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({});

  const { status, previewUrl, terminalOutput, error, isReady, restart, updateFile } =
    useWebContainer(files);

  // Initialize local files from props and select first file
  useEffect(() => {
    setLocalFiles(files);

    // Auto-select first .jsx or .tsx file if none selected
    if (!selectedFile && Object.keys(files).length > 0) {
      const jsxFile = Object.keys(files).find(
        (f) => f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('App.jsx')
      );
      const firstFile = jsxFile || Object.keys(files)[0];
      setSelectedFile(firstFile);
      setOpenFiles([firstFile]);
    }
  }, [files, selectedFile]);

  // Handle file selection from tree
  const handleSelectFile = useCallback((path: string) => {
    setSelectedFile(path);
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path]);
    }
  }, [openFiles]);

  // Handle file tab close
  const handleCloseTab = useCallback((path: string) => {
    setOpenFiles((prev) => {
      const newFiles = prev.filter((f) => f !== path);
      // If closing the selected file, select the previous one
      if (selectedFile === path && newFiles.length > 0) {
        const idx = prev.indexOf(path);
        setSelectedFile(newFiles[Math.max(0, idx - 1)]);
      } else if (newFiles.length === 0) {
        setSelectedFile(null);
      }
      return newFiles;
    });
  }, [selectedFile]);

  // Handle code changes in editor
  const handleEditorChange = useCallback((content: string) => {
    if (!selectedFile) return;

    setLocalFiles((prev) => ({ ...prev, [selectedFile]: content }));
    setUnsavedFiles((prev) => new Set(prev).add(selectedFile));
    onCodeChange(selectedFile, content);

    // Hot reload to WebContainer
    updateFile(selectedFile, content);
  }, [selectedFile, onCodeChange, updateFile]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave();
    setUnsavedFiles(new Set()); // Clear unsaved indicators
  }, [onSave]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gray-900 font-semibold text-base">
            {title || 'Preview'}
          </span>
          <StatusIndicator status={status} />
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('preview')}
              className={`h-8 px-3 ${viewMode === 'preview'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600'
                }`}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('code')}
              className={`h-8 px-3 ${viewMode === 'code'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600'
                }`}
            >
              <Code className="h-4 w-4 mr-1.5" />
              Code
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('split')}
              className={`h-8 px-3 ${viewMode === 'split'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600'
                }`}
            >
              <Columns2 className="h-4 w-4 mr-1.5" />
              Split
            </Button>
          </div>

          {/* Device Selector (for responsive preview) */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
              className="h-8 px-3 text-gray-600 hover:bg-gray-100"
            >
              {(() => {
                const device = DEVICE_PRESETS.find(d => d.id === selectedDevice);
                const Icon = device?.icon || Monitor;
                return <Icon className="h-4 w-4 mr-1.5" />;
              })()}
              {DEVICE_PRESETS.find(d => d.id === selectedDevice)?.name}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {/* Device dropdown menu */}
            {showDeviceMenu && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Devices
                </div>
                {DEVICE_PRESETS.map((device) => {
                  const Icon = device.icon;
                  const isResponsive = device.id === 'responsive';
                  return (
                    <button
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device.id);
                        setShowDeviceMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 ${selectedDevice === device.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{device.name}</span>
                      {!isResponsive && (
                        <span className="text-xs text-gray-400">
                          {device.width}×{device.height}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTerminal(!showTerminal)}
            className={`h-8 px-2 ${showTerminal ? 'bg-gray-200' : ''}`}
          >
            <Terminal className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={restart}
            disabled={status.phase === 'booting' || status.phase === 'installing'}
            className="h-8 px-2"
          >
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

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <ErrorScreen error={error} onRetry={restart} />
          ) : !isReady || isRefining ? (
            <LoadingScreen status={isRefining ? { phase: 'mounting', message: 'Updating your website...' } : status} />
          ) : (
            <div className="h-full flex">
              {/* Code Editor Panel (when in code or split mode) */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div
                  className="h-full flex bg-gray-900"
                  style={{ width: viewMode === 'split' ? '50%' : '100%' }}
                >
                  {/* File Tree Sidebar */}
                  <div className="w-56 flex-shrink-0 border-r border-gray-700">
                    <FileTree
                      files={localFiles}
                      selectedFile={selectedFile}
                      onSelectFile={handleSelectFile}
                    />
                  </div>

                  {/* Editor Area */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Tab Bar */}
                    <FileTabs
                      openFiles={openFiles}
                      activeFile={selectedFile}
                      unsavedFiles={unsavedFiles}
                      onSelectTab={handleSelectFile}
                      onCloseTab={handleCloseTab}
                    />

                    {/* Monaco Editor */}
                    {selectedFile ? (
                      <div className="flex-1">
                        <CodeEditor
                          value={localFiles[selectedFile] || ''}
                          filePath={selectedFile}
                          onChange={handleEditorChange}
                          onSave={handleSave}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
                        <div className="text-center">
                          <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Select a file to edit</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview iframe (when in preview or split mode) */}
              {(viewMode === 'preview' || viewMode === 'split') && previewUrl && (() => {
                const device = DEVICE_PRESETS.find(d => d.id === selectedDevice);
                const isResponsive = selectedDevice === 'responsive';
                const deviceWidth = isResponsive ? '100%' : `${device?.width}px`;
                const deviceHeight = isResponsive ? '100%' : `${device?.height}px`;

                return (
                  <div
                    className="h-full flex items-center justify-center bg-gray-100"
                    style={{ width: viewMode === 'split' ? '50%' : '100%' }}
                  >
                    {/* Device frame wrapper */}
                    <div
                      className={`relative ${!isResponsive ? 'shadow-2xl rounded-2xl overflow-hidden border-4 border-gray-800' : ''}`}
                      style={{
                        width: deviceWidth,
                        height: isResponsive ? '100%' : 'auto',
                        maxHeight: isResponsive ? '100%' : 'calc(100% - 40px)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Device label (non-responsive) */}
                      {!isResponsive && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                          {device?.name} ({device?.width}×{device?.height})
                        </div>
                      )}
                      <iframe
                        src={previewUrl}
                        className="w-full border-none bg-white"
                        style={{
                          height: isResponsive ? '100%' : deviceHeight,
                        }}
                        title="Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Terminal panel */}
        {showTerminal && (
          <TerminalPanel
            output={terminalOutput}
            isExpanded={showTerminal}
            onToggle={() => setShowTerminal(!showTerminal)}
          />
        )}
      </div>
    </div>
  );
}
