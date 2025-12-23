// frontend/src/components/editor/BuildingProgress.tsx
// bolt.diy-style building progress shown in the preview panel during generation

import { CheckCircle2, Circle, Loader2, XCircle, File, Code, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Todo {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    duration?: number;
}

interface BuildingProgressProps {
    todos: Todo[];
    progress: number;
    thinkingMessage: string;
    streamingFiles: Record<string, string>;
    isGenerating: boolean;
}

// Default todos to show when backend doesn't send any
const DEFAULT_TODOS: Todo[] = [
    { id: 'setup', title: 'Initialize React 19 project with TypeScript', status: 'pending' },
    { id: 'deps', title: 'Set up shadcn/ui and required dependencies', status: 'pending' },
    { id: 'header', title: 'Create Header component', status: 'pending' },
    { id: 'hero', title: 'Create Hero component', status: 'pending' },
    { id: 'features', title: 'Create Features component', status: 'pending' },
    { id: 'about', title: 'Create About component', status: 'pending' },
    { id: 'contact', title: 'Create Contact component', status: 'pending' },
    { id: 'footer', title: 'Create Footer component', status: 'pending' },
    { id: 'styling', title: 'Implement responsive design and mobile optimization', status: 'pending' },
    { id: 'animations', title: 'Add animations and interactions', status: 'pending' },
];

// Simulate progress based on percentage when backend doesn't send real todos
function simulateProgress(todos: Todo[], progress: number): Todo[] {
    const totalTodos = todos.length;
    const completedCount = Math.floor((progress / 100) * totalTodos);
    const inProgressIndex = completedCount < totalTodos ? completedCount : -1;

    return todos.map((todo, index) => ({
        ...todo,
        status: index < completedCount ? 'completed' :
            index === inProgressIndex ? 'in_progress' : 'pending'
    }));
}

export function BuildingProgress({
    todos: propTodos,
    progress,
    thinkingMessage,
    streamingFiles,
    isGenerating,
}: BuildingProgressProps) {
    // Use provided todos or fallback to defaults with simulated progress
    const todos = propTodos.length > 0 ? propTodos : simulateProgress(DEFAULT_TODOS, progress);
    const completedCount = todos.filter(t => t.status === 'completed').length;
    const fileCount = Object.keys(streamingFiles).length;

    const getStatusIcon = (status: Todo['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'in_progress':
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Circle className="h-4 w-4 text-slate-600" />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
            {/* Header Section */}
            <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <Sparkles className="h-8 w-8 text-blue-500" />
                        {isGenerating && (
                            <div className="absolute inset-0 animate-ping">
                                <Sparkles className="h-8 w-8 text-blue-500 opacity-50" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Generating React App...</h2>
                        <p className="text-sm text-slate-400">OpenCode is creating your React project</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{completedCount}/{todos.length} tasks completed</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* AI Thinking */}
                {thinkingMessage && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Loader2 className="h-5 w-5 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-blue-300 mb-1">AI is thinking...</p>
                                <p className="text-sm text-blue-200/80">{thinkingMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Todo Progress List */}
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            Building Your React App
                        </h3>
                    </div>

                    <div className="divide-y divide-slate-700/50">
                        {todos.map((todo, index) => (
                            <div
                                key={todo.id}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 transition-all duration-300",
                                    todo.status === 'in_progress' && "bg-blue-500/5",
                                    todo.status === 'completed' && "bg-green-500/5"
                                )}
                                style={{
                                    animation: todo.status === 'completed' ? 'slideIn 0.3s ease-out' : undefined,
                                    animationDelay: `${index * 50}ms`,
                                }}
                            >
                                {getStatusIcon(todo.status)}

                                <span
                                    className={cn(
                                        "flex-1 text-sm transition-colors",
                                        todo.status === 'completed' && "text-slate-400 line-through",
                                        todo.status === 'in_progress' && "text-white font-medium",
                                        todo.status === 'failed' && "text-red-400",
                                        todo.status === 'pending' && "text-slate-500"
                                    )}
                                >
                                    {todo.title}
                                </span>

                                {todo.duration && todo.status === 'completed' && (
                                    <span className="text-xs text-slate-500 font-mono">
                                        {(todo.duration / 1000).toFixed(1)}s
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Files Created Section */}
                {fileCount > 0 && (
                    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <File className="h-4 w-4" />
                                Files Created
                            </h3>
                            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                                {fileCount} files
                            </span>
                        </div>

                        <div className="max-h-48 overflow-y-auto">
                            {Object.keys(streamingFiles).map((filePath, index) => (
                                <div
                                    key={filePath}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700/30 transition-colors"
                                    style={{
                                        animation: 'fadeInSlide 0.3s ease-out',
                                        animationDelay: `${index * 30}ms`,
                                        animationFillMode: 'backwards',
                                    }}
                                >
                                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                    <code className={cn(
                                        "text-xs font-mono truncate",
                                        getFileColor(filePath)
                                    )}>
                                        {filePath}
                                    </code>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Design Info */}
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                    <div className="flex items-start gap-3">
                        <Palette className="h-5 w-5 text-purple-400 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-slate-300 font-medium mb-1">Tech Stack</p>
                            <p className="text-slate-500 text-xs">
                                React 18 + Vite + Tailwind CSS + Lucide Icons
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/50">
                <p className="text-xs text-slate-500 text-center">
                    {isGenerating
                        ? "Please wait while AI generates your code..."
                        : "Generation complete! Preview will appear shortly."}
                </p>
            </div>

            {/* Animations */}
            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0.5;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-12px);
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

// Helper: Get file color based on extension
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
        default:
            return 'text-slate-300';
    }
}

export default BuildingProgress;
