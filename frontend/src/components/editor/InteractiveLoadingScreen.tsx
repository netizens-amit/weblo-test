// frontend/src/components/editor/InteractiveLoadingScreen.tsx
// Beautiful interactive loading screen for the preview panel

import { useEffect, useState } from 'react';
import { Sparkles, Code, Palette, Zap, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveLoadingScreenProps {
    thinkingMessage?: string;
    streamingFiles?: Record<string, string>;
}

const LOADING_STEPS = [
    { label: 'Setting up project', icon: Code, duration: 2000 },
    { label: 'Creating components', icon: Sparkles, duration: 4000 },
    { label: 'Applying styles', icon: Palette, duration: 3000 },
    { label: 'Optimizing code', icon: Zap, duration: 2000 },
];

export function InteractiveLoadingScreen({
    thinkingMessage,
    streamingFiles = {}
}: InteractiveLoadingScreenProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [dots, setDots] = useState('');

    // Animate dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    // Cycle through steps based on file count
    useEffect(() => {
        const fileCount = Object.keys(streamingFiles).length;
        if (fileCount < 3) setCurrentStep(0);
        else if (fileCount < 6) setCurrentStep(1);
        else if (fileCount < 10) setCurrentStep(2);
        else setCurrentStep(3);
    }, [streamingFiles]);

    const fileCount = Object.keys(streamingFiles).length;
    const recentFile = Object.keys(streamingFiles).slice(-1)[0];

    return (
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating orbs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Main content */}
            <div className="relative z-10 text-center max-w-md px-6">
                {/* Animated logo */}
                <div className="relative mb-8 inline-block">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/25">
                        <Sparkles className="h-10 w-10 text-white" />
                    </div>

                    {/* Orbiting dots */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400" />
                    </div>

                    {/* Glow effect */}
                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-2">
                    Generating React App{dots}
                </h2>

                {/* Subtitle with thinking message */}
                <p className="text-slate-400 text-sm mb-8">
                    {thinkingMessage || 'AI is creating your application'}
                </p>

                {/* Steps indicator */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    {LOADING_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                            <div key={step.label} className="flex flex-col items-center gap-2">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                        isActive && "bg-blue-500/20 ring-2 ring-blue-500/50 scale-110",
                                        isCompleted && "bg-green-500/20",
                                        !isActive && !isCompleted && "bg-slate-800/50"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-5 w-5 text-green-400" />
                                    ) : isActive ? (
                                        <Icon className="h-5 w-5 text-blue-400 animate-pulse" />
                                    ) : (
                                        <Icon className="h-5 w-5 text-slate-600" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-xs transition-colors",
                                    isActive && "text-white",
                                    isCompleted && "text-slate-400",
                                    !isActive && !isCompleted && "text-slate-600"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* File count indicator */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-700/50">
                    <div className="flex items-center justify-center gap-2">
                        {fileCount > 0 ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-sm text-slate-300">
                                    <span className="text-green-400 font-semibold">{fileCount}</span> files created
                                </span>
                            </>
                        ) : (
                            <>
                                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                                <span className="text-sm text-slate-400">Preparing project structure...</span>
                            </>
                        )}
                    </div>

                    {/* Current file being created */}
                    {recentFile && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                            <p className="text-xs text-slate-500 truncate">
                                Creating: <span className="text-blue-400">{recentFile}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom wave decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-800/50 to-transparent" />

            {/* CSS for animations */}
            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
        </div>
    );
}

export default InteractiveLoadingScreen;
