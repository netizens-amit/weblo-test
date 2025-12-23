import { useState, useEffect, useRef, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';

export interface WebContainerStatus {
    phase: 'idle' | 'booting' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';
    message: string;
    progress?: number;
}


export interface UseWebContainerResult {
    status: WebContainerStatus;
    previewUrl: string | null;
    terminalOutput: string[];
    error: Error | null;
    isReady: boolean;
    restart: () => Promise<void>;
    updateFile: (path: string, content: string) => Promise<void>;
}

// WebContainers can only boot ONCE per browser tab.
// We manage this globally to prevent "Unable to create more instances" error.

interface WebContainerState {
    instance: WebContainer | null;
    booting: boolean;
    bootPromise: Promise<WebContainer> | null;
    lastProjectId: string | null;
}

const wcState: WebContainerState = {
    instance: null,
    booting: false,
    bootPromise: null,
    lastProjectId: null,
};

async function getOrBootWebContainer(): Promise<WebContainer> {
    // Already have an instance? Return it
    if (wcState.instance) {
        return wcState.instance;
    }

    // Already booting? Wait for it
    if (wcState.booting && wcState.bootPromise) {
        return wcState.bootPromise;
    }

    // Start booting with cross-origin isolation enabled
    wcState.booting = true;
    wcState.bootPromise = WebContainer.boot({
        coep: 'credentialless',  // Enable cross-origin isolation for iframe preview
    });

    try {
        wcState.instance = await wcState.bootPromise;
        console.log('✅ WebContainer booted successfully (singleton)');
        return wcState.instance;
    } catch (err) {
        // Check if it's the "unable to create more instances" error
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('Unable to create more instances') || errMsg.includes('more instances')) {
            // Try to get the existing instance by reloading
            console.warn('⚠️ WebContainer instance limit reached. Please refresh the page.');
            throw new Error('WebContainer instance limit reached. Please refresh the page to use the preview.');
        }
        throw err;
    } finally {
        wcState.booting = false;
    }
}

//hook
export function useWebContainer(files: Record<string, string>): UseWebContainerResult {
    const [status, setStatus] = useState<WebContainerStatus>({
        phase: 'idle',
        message: 'Initializing...',
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [error, setError] = useState<Error | null>(null);

    const filesRef = useRef<Record<string, string>>(files);
    const hasInitialized = useRef(false);
    const devServerProcess = useRef<any>(null);
    const mountedRef = useRef(true);

    // Track component mount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Safe state setters (prevent updates after unmount)
    const safeSetStatus = useCallback((newStatus: WebContainerStatus) => {
        if (mountedRef.current) setStatus(newStatus);
    }, []);

    const safeSetError = useCallback((err: Error | null) => {
        if (mountedRef.current) setError(err);
    }, []);

    const safeSetPreviewUrl = useCallback((url: string | null) => {
        if (mountedRef.current) setPreviewUrl(url);
    }, []);

    // Update files ref when files change
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    // Append terminal output
    const appendOutput = useCallback((text: string) => {
        if (mountedRef.current) {
            setTerminalOutput((prev) => [...prev.slice(-100), text]);
        }
    }, []);

    // Convert files to WebContainer format
    const convertToWebContainerFiles = useCallback((projectFiles: Record<string, string>) => {
        const wcFiles: Record<string, any> = {};

        Object.entries(projectFiles).forEach(([path, content]) => {
            // CRITICAL FIX: Normalize Windows backslashes to forward slashes
            let cleanPath = path.replace(/\\/g, '/');
            cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

            const parts = cleanPath.split('/');

            let current = wcFiles;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { directory: {} };
                }
                current = current[part].directory;
            }

            const fileName = parts[parts.length - 1];
            current[fileName] = {
                file: { contents: content },
            };
        });

        return wcFiles;
    }, []);

    // Mount files to container
    const mountFiles = useCallback(
        async (container: WebContainer, projectFiles: Record<string, string>) => {
            safeSetStatus({ phase: 'mounting', message: 'Mounting project files...' });
            appendOutput('📁 Mounting project files...');

            const wcFiles = convertToWebContainerFiles(projectFiles);
            await container.mount(wcFiles);

            appendOutput(`✅ Mounted ${Object.keys(projectFiles).length} files`);
        },
        [convertToWebContainerFiles, appendOutput, safeSetStatus]
    );

    // Run npm install with retry logic
    const runInstall = useCallback(
        async (container: WebContainer) => {
            safeSetStatus({ phase: 'installing', message: 'Installing dependencies...', progress: 0 });
            appendOutput('📦 Running npm install...');

            // First try with --legacy-peer-deps (helps with React 19 compatibility)
            let installArgs = ['install', '--legacy-peer-deps'];
            let installProcess = await container.spawn('npm', installArgs);
            let outputText = '';

            installProcess.output.pipeTo(
                new WritableStream({
                    write(data) {
                        outputText += data;
                        appendOutput(data);
                        if (data.includes('added')) {
                            setStatus((prev) => ({
                                ...prev,
                                progress: Math.min((prev.progress || 0) + 20, 90),
                            }));
                        }
                    },
                })
            );

            let exitCode = await installProcess.exit;

            // If failed, try with --force
            if (exitCode !== 0) {
                appendOutput('⚠️ First install attempt failed, trying with --force...');
                safeSetStatus({ phase: 'installing', message: 'Retrying install...', progress: 50 });

                installProcess = await container.spawn('npm', ['install', '--force']);

                installProcess.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            outputText += data;
                            appendOutput(data);
                        },
                    })
                );

                exitCode = await installProcess.exit;
            }

            if (exitCode !== 0) {
                // Check for common error patterns
                if (outputText.includes('ERESOLVE')) {
                    throw new Error('Dependency resolution failed. Try simplifying package.json dependencies.');
                } else if (outputText.includes('ENOENT')) {
                    throw new Error('Package not found. Check package names in package.json.');
                } else if (outputText.includes('network')) {
                    throw new Error('Network error during npm install. COEP headers may be blocking requests.');
                }
                throw new Error(`npm install failed with exit code ${exitCode}`);
            }

            appendOutput('✅ Dependencies installed');
        },
        [appendOutput, safeSetStatus]
    );

    // Start dev server
    const startDevServer = useCallback(
        async (container: WebContainer) => {
            safeSetStatus({ phase: 'starting', message: 'Starting dev server...' });
            appendOutput('🔧 Starting Vite dev server...');

            // Kill existing process if any
            if (devServerProcess.current) {
                try {
                    devServerProcess.current.kill();
                } catch (e) {
                    // Ignore kill errors
                }
            }

            const serverProcess = await container.spawn('npm', ['run', 'dev']);
            devServerProcess.current = serverProcess;

            serverProcess.output.pipeTo(
                new WritableStream({
                    write(data) {
                        appendOutput(data);
                    },
                })
            );

            // Wait for server-ready event
            return new Promise<string>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Dev server startup timeout (60s)'));
                }, 60000);

                let resolved = false;

                // Primary: server-ready event
                container.on('server-ready', (_port, url) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(timeout);
                    appendOutput(`✅ Dev server ready at ${url}`);
                    resolve(url);
                });

                // Backup: port open event (in case server-ready is missed)
                container.on('port', (port, type, url) => {
                    appendOutput(`🔌 Port ${port} ${type}: ${url}`);
                    if (!resolved && type === 'open' && url) {
                        resolved = true;
                        clearTimeout(timeout);
                        appendOutput(`✅ Server available via port event at ${url}`);
                        resolve(url);
                    }
                });

                container.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        },
        [appendOutput, safeSetStatus]
    );

    // Main initialization
    const initialize = useCallback(async () => {
        if (Object.keys(filesRef.current).length === 0) {
            safeSetStatus({ phase: 'idle', message: 'Waiting for files...' });
            return;
        }

        try {
            safeSetError(null);
            safeSetStatus({ phase: 'booting', message: 'Starting WebContainer...' });
            appendOutput('🚀 Booting WebContainer...');

            // Get or boot singleton container
            const container = await getOrBootWebContainer();
            if (!container) throw new Error('Failed to boot WebContainer');

            appendOutput('✅ WebContainer ready');

            // Mount files
            await mountFiles(container, filesRef.current);

            // Install dependencies
            await runInstall(container);

            // Start dev server
            const url = await startDevServer(container);
            safeSetPreviewUrl(url);

            safeSetStatus({ phase: 'ready', message: 'Ready!' });
        } catch (err) {
            console.error('WebContainer error:', err);
            safeSetError(err as Error);
            safeSetStatus({
                phase: 'error',
                message: err instanceof Error ? err.message : 'Unknown error',
            });
            appendOutput(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [mountFiles, runInstall, startDevServer, appendOutput, safeSetStatus, safeSetError, safeSetPreviewUrl]);

    // Update a single file
    const updateFile = useCallback(
        async (path: string, content: string) => {
            if (!wcState.instance) return;

            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
            await wcState.instance.fs.writeFile(cleanPath, content);
            appendOutput(`📝 Updated: ${cleanPath}`);
        },
        [appendOutput]
    );

    // Restart (remount files and restart dev server, but DON'T reboot container)
    const restart = useCallback(async () => {
        safeSetPreviewUrl(null);
        setTerminalOutput([]);

        if (devServerProcess.current) {
            try {
                devServerProcess.current.kill();
            } catch (e) {
                // Ignore
            }
            devServerProcess.current = null;
        }

        // Don't reboot, just remount and restart
        if (wcState.instance) {
            try {
                await mountFiles(wcState.instance, filesRef.current);
                await runInstall(wcState.instance);
                const url = await startDevServer(wcState.instance);
                safeSetPreviewUrl(url);
                safeSetStatus({ phase: 'ready', message: 'Ready!' });
            } catch (err) {
                safeSetError(err as Error);
                safeSetStatus({
                    phase: 'error',
                    message: err instanceof Error ? err.message : 'Restart failed',
                });
            }
        } else {
            await initialize();
        }
    }, [initialize, mountFiles, runInstall, startDevServer, safeSetPreviewUrl, safeSetStatus, safeSetError]);

    // Initialize on first render with files
    useEffect(() => {
        const fileKeys = Object.keys(files);
        const hasFiles = fileKeys.length > 0;
        const hasRequiredFiles = files['package.json'] || files['/package.json'];

        // Debug logging to trace file loading
        console.log('🔍 [WebContainer] File check:', {
            fileCount: fileKeys.length,
            hasFiles,
            hasRequiredFiles: !!hasRequiredFiles,
            hasInitialized: hasInitialized.current,
            fileKeys: fileKeys.slice(0, 10),
        });

        if (hasFiles && hasRequiredFiles && !hasInitialized.current) {
            console.log('🚀 [WebContainer] Starting initialization with files:', fileKeys);
            hasInitialized.current = true;
            initialize();
        } else if (hasFiles && !hasRequiredFiles) {
            console.warn('⚠️ [WebContainer] Files present but package.json missing! Keys:', fileKeys);
        }
    }, [files, initialize]);

    return {
        status,
        previewUrl,
        terminalOutput,
        error,
        isReady: status.phase === 'ready',
        restart,
        updateFile,
    };
}