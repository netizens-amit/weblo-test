import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Code, Eye, Monitor, Tablet, Smartphone } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface LivePreviewProps {
  htmlContent: string;
  cssContent: string;
  jsContent?: string;
  title?: string;
  onSave: () => void;
  onCodeChange: (filename: string, content: string) => void;
  isSaving: boolean;
  isDirty: boolean;
}

export default function LivePreview({
  htmlContent,
  cssContent,
  jsContent = '',
  title,
  onSave,
  onCodeChange,
  isSaving,
  isDirty,
}: LivePreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeFile, setActiveFile] = useState<'html' | 'css' | 'js'>('html');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe when content changes
  useEffect(() => {
    if (iframeRef.current && viewMode === 'preview') {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument;

      if (doc) {
        // Inject CSS and JS into HTML
        const fullHtml = injectAssets(htmlContent, cssContent, jsContent);

        doc.open();
        doc.write(fullHtml);
        doc.close();
      }
    }
  }, [htmlContent, cssContent, jsContent, viewMode]);

  const injectAssets = (html: string, css: string, js: string): string => {
    let result = html || '';
    
    // If CSS is external, replace <link> with inline <style>
    if (css && !result.includes('<style>')) {
      if (result.includes('</head>')) {
        result = result.replace(
            '</head>',
            `<style>${css}</style>\n</head>`
        );
      } else {
          result = `<style>${css}</style>` + result;
      }
    }

    // If JS exists, inject before </body>
    if (js && !result.includes('<script>')) {
      if (result.includes('</body>')) {
        result = result.replace(
            '</body>',
            `<script>${js}</script>\n</body>`
        );
      } else {
        result = result + `<script>${js}</script>`;
      }
    }

    return result;
  };

  const getIframeWidth = () => {
    switch (deviceMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">{title || 'Preview'}</span>
          {isDirty && (
            <span className="text-xs text-amber-400">● Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <Button
              size="sm"
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('preview')}
              className="rounded-none h-7 text-xs"
            >
              <Eye className="h-3 w-3 mr-2" />
              Preview
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'code' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('code')}
              className="rounded-none h-7 text-xs"
            >
              <Code className="h-3 w-3 mr-2" />
              Code
            </Button>
          </div>

          {/* Device mode (preview only) */}
          {viewMode === 'preview' && (
            <div className="flex rounded-lg overflow-hidden border border-slate-700 ml-2">
              <Button
                size="sm"
                variant={deviceMode === 'desktop' ? 'secondary' : 'ghost'}
                onClick={() => setDeviceMode('desktop')}
                className="rounded-none h-7 px-2"
              >
                <Monitor className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={deviceMode === 'tablet' ? 'secondary' : 'ghost'}
                onClick={() => setDeviceMode('tablet')}
                className="rounded-none h-7 px-2"
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={deviceMode === 'mobile' ? 'secondary' : 'ghost'}
                onClick={() => setDeviceMode('mobile')}
                className="rounded-none h-7 px-2"
              >
                <Smartphone className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Save button */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="ml-2 h-7 text-xs"
          >
            <Save className="h-3 w-3 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'preview' ? (
          <div className="h-full flex items-center justify-center bg-slate-950 p-4">
            <iframe
              ref={iframeRef}
              className="bg-white transition-all duration-300 shadow-xl"
              style={{
                width: getIframeWidth(),
                height: deviceMode === 'mobile' ? '667px' : '100%',
                border: deviceMode !== 'desktop' ? '1px solid #334155' : 'none',
                borderRadius: deviceMode !== 'desktop' ? '8px' : '0',
              }}
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              title="Preview"
            />
          </div>
        ) : (
          <Tabs value={activeFile} onValueChange={(v) => setActiveFile(v as any)} className="h-full flex flex-col">
            <TabsList className="bg-slate-900 border-b border-slate-800 rounded-none w-full justify-start px-2">
              <TabsTrigger value="html" className="text-xs data-[state=active]:bg-slate-800">index.html</TabsTrigger>
              <TabsTrigger value="css" className="text-xs data-[state=active]:bg-slate-800">style.css</TabsTrigger>
              <TabsTrigger value="js" className="text-xs data-[state=active]:bg-slate-800">script.js</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="flex-1 m-0 p-0 h-full">
              <Editor
                height="100%"
                language="html"
                value={htmlContent}
                onChange={(value) => onCodeChange('index.html', value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                }}
              />
            </TabsContent>

            <TabsContent value="css" className="flex-1 m-0 p-0 h-full">
              <Editor
                height="100%"
                language="css"
                value={cssContent}
                onChange={(value) => onCodeChange('style.css', value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                }}
              />
            </TabsContent>

            <TabsContent value="js" className="flex-1 m-0 p-0 h-full">
              <Editor
                height="100%"
                language="javascript"
                value={jsContent}
                onChange={(value) => onCodeChange('script.js', value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
