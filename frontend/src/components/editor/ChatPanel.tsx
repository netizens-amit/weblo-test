// frontend/src/components/editor/ChatPanel.tsx (FIXED)

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { TodoProgress } from './TodoProgress';
import { FileCreationProgress } from './FileCreationProgress';  // 🆕 NEW

interface Message {
  id: string;
  type: 'user' | 'system' | 'step';
  content: string;
  stepTitle?: string;
  isComplete?: boolean;
}

interface ChatPanelProps {
  projectName: string;
  originalPrompt: string;
  messages: Message[];
  isGenerating: boolean;
  progress: number;
  onSendMessage: (message: string) => void;
  onBack: () => void;
  todos: any[];
  tokenUsage: any;
  thinkingMessage: string;
  streamingFiles?: Record<string, string>;  // 🆕 Live file creation
}

export default function ChatPanel({
  projectName,
  originalPrompt,
  messages,
  isGenerating,
  progress,
  onSendMessage,
  onBack,
  todos,
  tokenUsage,
  thinkingMessage,
  streamingFiles = {},  // 🆕 Default to empty
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 📜 AUTO-SCROLL TO BOTTOM
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, todos, streamingFiles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* 🎯 HEADER */}
      <div className="flex-shrink-0 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-white font-semibold text-base">{projectName}</h2>
            <p className="text-xs text-slate-400 truncate">{originalPrompt}</p>
          </div>
        </div>
      </div>

      {/* 💬 MESSAGES + TODOS + FILE PROGRESS */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* ORIGINAL PROMPT */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-300">{originalPrompt}</p>
        </div>

        {/* AI THINKING */}
        {thinkingMessage && isGenerating && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-300">{thinkingMessage}</p>
            </div>
          </div>
        )}

        {/* 🆕 FILE CREATION PROGRESS (like bolt.diy) */}
        {(Object.keys(streamingFiles).length > 0 || isGenerating) && (
          <FileCreationProgress
            files={streamingFiles}
            isGenerating={isGenerating}
            title={isGenerating ? "Generating React components..." : "Generated Files"}
          />
        )}

        {/* TODO PROGRESS */}
        {todos.length > 0 && (
          <div className="my-4">
            <TodoProgress todos={todos} tokenUsage={tokenUsage} isGenerating={isGenerating} />
          </div>
        )}

        {/* MESSAGES - Filter out first message if it's the original prompt (already shown above) */}
        {messages
          .filter((msg, index) => !(index === 0 && msg.type === 'user' && msg.content === originalPrompt))
          .map((message) => (
          <div
            key={message.id}
            className={`rounded-lg p-4 ${
              message.type === 'user'
                ? 'bg-blue-600 text-white ml-auto max-w-[85%]'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            {message.stepTitle && (
              <p className="font-semibold text-sm mb-1">{message.stepTitle}</p>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}

        {/* GENERATION COMPLETE */}
        {progress === 100 && !isGenerating && Object.keys(streamingFiles).length > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 font-semibold mb-1">Generation Complete!</p>
            <p className="text-sm text-slate-300">
              Created {Object.keys(streamingFiles).length} files. You can now preview and edit the code.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ✍️ INPUT AREA */}
      <div className="flex-shrink-0 p-4 bg-slate-800 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your website changes..."
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-none"
            rows={3}
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isGenerating ? 'Generating...' : 'Ask AI to refine your website'}
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}