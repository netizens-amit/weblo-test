// frontend/src/components/editor/PreviewPanel.tsx

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Code2, Eye, Save, Smartphone, Tablet, Monitor } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface PreviewPanelProps {
  htmlContent: string;
  cssContent: string;
  title?: string;
  onSave: () => void;
  onCodeChange: (html: string, css: string) => void;
  isSaving?: boolean;
  isDirty?: boolean;
}

export default function PreviewPanel({
  htmlContent,
  cssContent,
  title,
  onSave,
  onCodeChange,
  isSaving = false,
  isDirty = false
}: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css'>('html');
  const [deviceSize, setDeviceSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || activeView !== 'preview') return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();
  }, [htmlContent, activeView]);

  const getDeviceWidth = () => {
    switch (deviceSize) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar - Light Theme matching reference */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-1">
          {/* Device Size Buttons */}
          <Button
            variant={deviceSize === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setDeviceSize('mobile')}
          >
            <Smartphone className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant={deviceSize === 'tablet' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setDeviceSize('tablet')}
          >
            <Tablet className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant={deviceSize === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setDeviceSize('desktop')}
          >
            <Monitor className="h-4 w-4 text-gray-600" />
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          {/* View Mode Buttons */}
          <Button
            variant={activeView === 'preview' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setActiveView('preview')}
          >
            <Eye className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant={activeView === 'code' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setActiveView('code')}
          >
            <Code2 className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Save Button */}
        <Button
          onClick={onSave}
          disabled={isSaving || !isDirty}
          variant="outline"
          className="gap-2 rounded-lg"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Code'}
        </Button>
      </div>

      {/* Content Area - Light gray background */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {activeView === 'preview' ? (
          <div className="h-full flex items-start justify-center p-4 overflow-auto">
            <div
              className="bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 transition-all duration-300"
              style={{
                width: getDeviceWidth(),
                maxWidth: '100%',
                minHeight: deviceSize === 'desktop' ? '100%' : 'auto',
                height: deviceSize === 'desktop' ? 'calc(100% - 2rem)' : 'auto'
              }}
            >
              <iframe
                ref={iframeRef}
                title={title || 'Preview'}
                className="w-full h-full border-0"
                style={{ minHeight: '600px' }}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-slate-900">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveCodeTab('html')}
                className={`px-4 py-2 text-sm ${activeCodeTab === 'html'
                  ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                HTML
              </button>
              <button
                onClick={() => setActiveCodeTab('css')}
                className={`px-4 py-2 text-sm ${activeCodeTab === 'css'
                  ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                CSS
              </button>
            </div>
            <div className="flex-1">
              <CodeEditor
                value={activeCodeTab === 'html' ? htmlContent : cssContent}
                filePath={activeCodeTab === 'html' ? 'index.html' : 'styles.css'}
                onChange={(value) => {
                  if (activeCodeTab === 'html') {
                    onCodeChange(value, cssContent);
                  } else {
                    onCodeChange(htmlContent, value);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
