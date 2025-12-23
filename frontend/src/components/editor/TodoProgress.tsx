// frontend/src/components/editor/TodoProgress.tsx

import { CheckCircle2, Circle, Loader2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  logs?: string[];
  error?: string;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: string;
  model: string;
  percentage: number;
}

interface TodoProgressProps {
  todos: Todo[];
  tokenUsage?: TokenUsage;
  isGenerating: boolean;
}

export function TodoProgress({ todos, tokenUsage, isGenerating }: TodoProgressProps) {
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());

  const toggleTodo = (todoId: string) => {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: Todo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-slate-400" />;
    }
  };

  const completedCount = todos.filter(t => t.status === 'completed').length;
  const progressPercentage = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  if (todos.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Header with Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Building Your React App
          </h3>
          <span className="text-xs text-slate-400">
            {completedCount} / {todos.length} completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              isGenerating ? "bg-blue-500" : "bg-green-500"
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Token Usage */}
      {tokenUsage && (
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Context</span>
            <span className="text-white font-mono">
              {tokenUsage.totalTokens.toLocaleString()} tokens
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(tokenUsage.percentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {tokenUsage.percentage.toFixed(1)}% used
            </span>
            <span className="text-emerald-400 font-semibold">
              ${tokenUsage.costUSD} spent
            </span>
          </div>
        </div>
      )}

      {/* Todo List */}
      <div className="space-y-1">
        {todos.map((todo) => {
          const isExpanded = expandedTodos.has(todo.id);
          const hasLogs = todo.logs && todo.logs.length > 0;

          return (
            <div
              key={todo.id}
              className={cn(
                "rounded-lg transition-colors",
                todo.status === 'completed' && "bg-green-500/5",
                todo.status === 'in_progress' && "bg-blue-500/5",
                todo.status === 'failed' && "bg-red-500/5"
              )}
            >
              {/* Todo Header */}
              <button
                onClick={() => hasLogs && toggleTodo(todo.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors",
                  hasLogs && "hover:bg-slate-800/30 cursor-pointer"
                )}
                disabled={!hasLogs}
              >
                {/* Status Icon */}
                {getStatusIcon(todo.status)}

                {/* Title */}
                <span
                  className={cn(
                    "flex-1 text-sm",
                    todo.status === 'completed' && "text-slate-300 line-through",
                    todo.status === 'in_progress' && "text-white font-medium",
                    todo.status === 'failed' && "text-red-400",
                    todo.status === 'pending' && "text-slate-500"
                  )}
                >
                  {todo.title}
                </span>

                {/* Duration */}
                {todo.duration && todo.status === 'completed' && (
                  <span className="text-xs text-slate-500">
                    {(todo.duration / 1000).toFixed(1)}s
                  </span>
                )}

                {/* Expand Icon */}
                {hasLogs && (
                  <div className="text-slate-500">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                )}
              </button>

              {/* Expanded Logs */}
              {isExpanded && hasLogs && (
                <div className="px-3 pb-3 space-y-1">
                  {todo.logs!.map((log, logIndex) => (
                    <div
                      key={logIndex}
                      className="text-xs text-slate-400 pl-8 font-mono"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {todo.error && (
                <div className="px-3 pb-3 pl-11">
                  <div className="text-xs text-red-400 bg-red-500/10 rounded p-2 font-mono">
                    {todo.error}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LSP Status (similar to OpenCode) */}
      {isGenerating && (
        <div className="pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-500">
            LSPs will activate as files are read
          </div>
        </div>
      )}
    </div>
  );
}