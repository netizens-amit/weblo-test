// frontend/src/hooks/useArtifactStream.ts

import { useState, useCallback, useRef, useEffect } from 'react';
import { ArtifactParser } from '../lib/artifact-parser';
import { WebContainer } from '@webcontainer/api';

export interface UseArtifactStreamOptions {
    webcontainer: WebContainer | null;
    projectId: string;
    onComplete?: (files: Record<string, string>) => void;
    onError?: (error: Error) => void;
}

export function useArtifactStream(options: UseArtifactStreamOptions) {
    const { webcontainer, projectId, onComplete, onError } = options;

    const [isStreaming, setIsStreaming] = useState(false);
    const [files, setFiles] = useState<Record<string, string>>({});
    const [filesCreated, setFilesCreated] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [currentFile, setCurrentFile] = useState<string>('');

    const parserRef = useRef<ArtifactParser | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const shellCommandsRef = useRef<string[]>([]);

    /**
     * Start streaming from backend
     */
    const startStream = useCallback(async (
        prompt: string,
        preferences?: any,
        isRefinement = false
    ) => {
        if (!webcontainer) {
            onError?.(new Error('WebContainer not initialized'));
            return;
        }

        // Reset state
        setIsStreaming(true);
        setFiles({});
        setFilesCreated([]);
        setProgress(0);
        shellCommandsRef.current = [];

        // Create parser
        parserRef.current = new ArtifactParser({
            onArtifactOpen: (artifact) => {
                console.log('🎨 Starting artifact:', artifact.title);
                setProgress(5);
            },

            onActionComplete: async (action) => {
                if (action.type === 'file' && action.filePath && action.content) {
                    setCurrentFile(action.filePath);

                    try {
                        // Ensure parent directories exist
                        const parts = action.filePath.split('/');
                        let currentPath = '';

                        for (let i = 0; i < parts.length - 1; i++) {
                            currentPath += parts[i];
                            try {
                                await webcontainer.fs.mkdir(currentPath, { recursive: true });
                            } catch (e) {
                                // Directory might already exist
                            }
                            currentPath += '/';
                        }

                        // Write file to WebContainer
                        await webcontainer.fs.writeFile(action.filePath, action.content);

                        console.log(`✅ Created: ${action.filePath}`);

                        // Update state
                        setFiles(prev => ({
                            ...prev,
                            [action.filePath!]: action.content!,
                        }));

                        setFilesCreated(prev => [...prev, action.filePath!]);

                    } catch (error) {
                        console.error(`❌ Failed to write ${action.filePath}:`, error);
                    }
                }

                if (action.type === 'shell' && action.command) {
                    shellCommandsRef.current.push(action.command);
                    console.log(`🐚 Shell command queued: ${action.command}`);
                }
            },

            onProgress: (info) => {
                // Update progress (5-90%)
                const progressPercent = Math.min(90, 5 + (info.filesCreated * 5));
                setProgress(progressPercent);
            },

            onArtifactClose: async (artifact) => {
                console.log(`🎉 Artifact complete: ${artifact.actions.length} actions`);

                // Execute shell commands
                for (const command of shellCommandsRef.current) {
                    try {
                        console.log(`🐚 Executing: ${command}`);
                        const process = await webcontainer.spawn('sh', ['-c', command]);
                        await process.exit;
                        console.log(`✅ Command complete: ${command}`);
                    } catch (error) {
                        console.error(`❌ Shell command failed: ${command}`, error);
                    }
                }

                setProgress(95);

                // Start dev server
                try {
                    console.log('🚀 Starting dev server...');
                    const devProcess = await webcontainer.spawn('npm', ['run', 'dev']);

                    devProcess.output.pipeTo(
                        new WritableStream({
                            write(data) {
                                console.log('[vite]', data);
                            },
                        })
                    );

                    setProgress(100);
                    setIsStreaming(false);

                    // Get all files for callback
                    const allFiles = artifact.actions
                        .filter(a => a.type === 'file')
                        .reduce((acc, action) => {
                            if (action.filePath && action.content) {
                                acc[action.filePath] = action.content;
                            }
                            return acc;
                        }, {} as Record<string, string>);

                    onComplete?.(allFiles);

                } catch (error) {
                    console.error('❌ Failed to start dev server:', error);
                    onError?.(error as Error);
                }
            },
        });

        // Connect to SSE endpoint
        const params = new URLSearchParams({
            prompt,
            ...(preferences && { preferences: JSON.stringify(preferences) }),
            ...(isRefinement && { isRefinement: 'true' }),
        });

        const url = `/api/generation/stream/${projectId}?${params.toString()}`;
        console.log('📡 Connecting to SSE:', url);

        eventSourceRef.current = new EventSource(url);

        eventSourceRef.current.addEventListener('chunk', (event) => {
            parserRef.current?.parse(event.data);
        });

        eventSourceRef.current.addEventListener('progress', (event) => {
            const data = JSON.parse(event.data);
            console.log('📊 Progress:', data);
        });

        eventSourceRef.current.addEventListener('done', (event) => {
            console.log('✅ Stream complete:', event.data);
            eventSourceRef.current?.close();
        });

        eventSourceRef.current.addEventListener('error', (event) => {
            console.error('❌ SSE error:', event);
            setIsStreaming(false);
            eventSourceRef.current?.close();
            onError?.(new Error('Stream connection failed'));
        });

    }, [webcontainer, projectId, onComplete, onError]);

    /**
     * Stop streaming
     */
    const stopStream = useCallback(() => {
        eventSourceRef.current?.close();
        parserRef.current?.reset();
        setIsStreaming(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, [stopStream]);

    return {
        startStream,
        stopStream,
        isStreaming,
        files,
        filesCreated,
        progress,
        currentFile,
    };
}
