// frontend/src/components/editor/GenerationProgress.tsx
// Interactive loading component with live file generation logs

import { useState, useEffect } from 'react';
import {
    Sparkles,
    FileCode,
    Check,
    Loader2,
    Package,
    Palette,
    Code,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerationProgressProps {
    isGenerating: boolean;
    streamingFiles: Record<string, string>;
    thinkingMessage?: string;
    onComplete?: () => void;
}

// Animation steps for the generation process
const GENERATION_STEPS = [
    { id: 'init', label: 'Initializing project...', icon: Sparkles },
    { id: 'config', label: 'Creating config files...', icon: Package },
    { id: 'components', label: 'Building components...', icon: Code },
    { id: 'styles', label: 'Applying styles...', icon: Palette },
    { id: 'finishing', label: 'Finishing up...', icon: Zap },
];

// Get file icon color based on extension
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

// Get folder from path
function getFolderFromPath(path: string): string {
    const parts = path.split('/');
    if (parts.length > 1) {
        return parts.slice(0, -1).join('/');
    }
    return '';
}

export function GenerationProgress({
    isGenerating,
    streamingFiles,
    thinkingMessage,
}: GenerationProgressProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedFiles, setCompletedFiles] = useState<string[]>([]);

    // Track files as they're added
    useEffect(() => {
        const files = Object.keys(streamingFiles);
        if (files.length > completedFiles.length) {
            setCompletedFiles(files);
        }
    }, [streamingFiles, completedFiles.length]);

    // Progress through steps based on file count
    useEffect(() => {
        const fileCount = Object.keys(streamingFiles).length;
        if (fileCount === 0) {
            setCurrentStep(0);
        } else if (fileCount < 3) {
            setCurrentStep(1);
        } else if (fileCount < 8) {
            setCurrentStep(2);
        } else if (fileCount < 12) {
            setCurrentStep(3);
        } else {
            setCurrentStep(4);
        }
    }, [streamingFiles]);

    const fileList = Object.keys(streamingFiles);
    const recentFiles = fileList.slice(-5).reverse();

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Header with animated icon */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        {isGenerating && (
                            <div className="absolute -inset-1 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 opacity-30 blur animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">
                            {isGenerating ? 'Building Your App...' : 'Generation Complete!'}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {fileList.length} files created
                        </p>
                    </div>
                </div>
            </div>

            {/* Generation Steps */}
            <div className="px-4 py-3 space-y-2">
                {GENERATION_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep && isGenerating;
                    const isCompleted = index < currentStep || (!isGenerating && fileList.length > 0);

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300",
                                isActive && "bg-blue-500/10 border border-blue-500/20",
                                isCompleted && "opacity-70"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                isActive && "bg-blue-500/20",
                                isCompleted && "bg-green-500/20"
                            )}>
                                {isCompleted ? (
                                    <Check className="h-3.5 w-3.5 text-green-400" />
                                ) : isActive ? (
                                    <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                                ) : (
                                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                                )}
                            </div>
                            <span className={cn(
                                "text-sm",
                                isActive && "text-white font-medium",
                                isCompleted && "text-slate-400 line-through",
                                !isActive && !isCompleted && "text-slate-500"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Live File Logs */}
            {recentFiles.length > 0 && (
                <div className="border-t border-slate-700/50">
                    <div className="px-4 py-2 bg-slate-900/50">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                            Recent Files
                        </p>
                    </div>
                    <div className="px-4 py-2 space-y-1 max-h-32 overflow-y-auto">
                        {recentFiles.map((file, index) => {
                            const folder = getFolderFromPath(file);
                            const filename = file.split('/').pop() || file;

                            return (
                                <div
                                    key={file}
                                    className="flex items-center gap-2 py-1.5 animate-in slide-in-from-left-2 duration-300"
                                    style={{ animationDelay: `${index * 50} ms` }}
                                >
                                    {index === 0 && isGenerating ? (
                                        <Loader2 className="h-3 w-3 text-blue-400 animate-spin flex-shrink-0" />
                                    ) : (
                                        <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                                    )}
                                    <FileCode className={cn("h-3.5 w-3.5 flex-shrink-0", getFileColor(file))} />
                                    <span className="text-xs truncate">
                                        {folder && (
                                            <span className="text-slate-500">{folder}/</span>
                                        )}
                                        <span className={getFileColor(file)}>{filename}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Thinking Message */}
            {thinkingMessage && isGenerating && (
                <div className="px-4 py-3 border-t border-slate-700/50 bg-blue-500/5">
                    <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        </div>
                        <p className="text-xs text-blue-300 leading-relaxed">
                            {thinkingMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Completion State */}
            {!isGenerating && fileList.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-700/50 bg-green-500/5">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-400" />
                        <p className="text-sm text-green-300">
                            All files generated successfully!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GenerationProgress;
