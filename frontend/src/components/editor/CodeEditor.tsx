// frontend/src/components/editor/CodeEditor.tsx
// Monaco editor wrapper with language detection and save shortcut

import { useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  filePath: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

// Get Monaco language from file extension
function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export default function CodeEditor({ value, filePath, onChange, onSave }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add Ctrl+S / Cmd+S keyboard shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });
  }, [onSave]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={getLanguage(filePath)}
        value={value}
        theme="vs-dark"
        onChange={(newValue) => onChange(newValue || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true, scale: 0.8 },
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 8, bottom: 8 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          tabSize: 2,
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
    </div>
  );
}
