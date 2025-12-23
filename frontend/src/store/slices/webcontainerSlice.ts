/**
 * WebContainer Redux Slice
 * 
 * Manages all WebContainer state in one place:
 * - Status (booting, ready, error)
 * - Preview URL
 * - Terminal output
 * - Mounted files
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getWebContainer, convertToWebContainerFormat } from '@/lib/webcontainer';

// State shape
export interface WebContainerState {
    status: 'idle' | 'booting' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';
    message: string;
    progress: number;
    previewUrl: string | null;
    terminalOutput: string[];
    mountedFiles: Record<string, string>;
    error: string | null;
    isInitialized: boolean;
}

const initialState: WebContainerState = {
    status: 'idle',
    message: 'Waiting for files...',
    progress: 0,
    previewUrl: null,
    terminalOutput: [],
    mountedFiles: {},
    error: null,
    isInitialized: false,
};

/**
 * Async thunk to initialize WebContainer with files
 * 
 * This is the main entry point - call this when files are ready:
 *   dispatch(initializeWebContainer(files))
 */
export const initializeWebContainer = createAsyncThunk(
    'webcontainer/initialize',
    async (files: Record<string, string>, { dispatch, rejectWithValue }) => {
        try {
            // Step 1: Boot WebContainer
            dispatch(setStatus({ status: 'booting', message: 'Starting WebContainer...', progress: 10 }));
            dispatch(appendOutput('🚀 Booting WebContainer...'));

            const container = await getWebContainer();
            dispatch(appendOutput('✅ WebContainer ready'));

            // Step 2: Mount files
            dispatch(setStatus({ status: 'mounting', message: 'Mounting project files...', progress: 20 }));
            dispatch(appendOutput(`📁 Mounting ${Object.keys(files).length} files...`));

            const wcFiles = convertToWebContainerFormat(files);
            await container.mount(wcFiles);

            dispatch(appendOutput('✅ Files mounted'));
            dispatch(setMountedFiles(files));

            // Step 3: Install dependencies
            dispatch(setStatus({ status: 'installing', message: 'Installing npm packages...', progress: 30 }));
            dispatch(appendOutput('📦 Running npm install...'));

            // Try with --legacy-peer-deps first (handles React 19 compatibility)
            let installProcess = await container.spawn('npm', ['install', '--legacy-peer-deps']);

            // Capture install output
            installProcess.output.pipeTo(new WritableStream({
                write(data) {
                    dispatch(appendOutput(data));
                }
            }));

            let installCode = await installProcess.exit;

            // If first attempt fails, try with --force
            if (installCode !== 0) {
                dispatch(appendOutput('⚠️ First install attempt failed, trying with --force...'));
                installProcess = await container.spawn('npm', ['install', '--force']);

                installProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        dispatch(appendOutput(data));
                    }
                }));

                installCode = await installProcess.exit;
            }

            if (installCode !== 0) {
                throw new Error('npm install failed');
            }

            dispatch(appendOutput('✅ Dependencies installed'));
            dispatch(setStatus({ status: 'starting', message: 'Starting dev server...', progress: 70 }));

            // Step 4: Register event listeners FIRST, then start dev server
            // CRITICAL: server-ready event may fire immediately after spawn
            return new Promise<string>(async (resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Dev server startup timeout (60s)'));
                }, 60000);

                let resolved = false;

                // Register listeners BEFORE starting server (bolt.diy pattern)
                container.on('server-ready', (_port, url) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(timeout);
                    dispatch(appendOutput(`✅ Dev server ready at ${url}`));
                    console.log('🎯 [WebContainer] server-ready event:', url);
                    resolve(url);
                });

                container.on('port', (port, type, url) => {
                    dispatch(appendOutput(`🔌 Port ${port} ${type}: ${url || 'no url'}`));
                    console.log('🔌 [WebContainer] port event:', { port, type, url });
                    if (!resolved && type === 'open' && url) {
                        resolved = true;
                        clearTimeout(timeout);
                        dispatch(appendOutput(`✅ Server available via port event at ${url}`));
                        resolve(url);
                    }
                });

                container.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });

                // NOW start the dev server (after listeners are registered)
                dispatch(appendOutput('🔄 Starting dev server...'));
                const devProcess = await container.spawn('npm', ['run', 'dev']);

                // Capture dev server output
                devProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        dispatch(appendOutput(data));
                    }
                }));
            });

        } catch (error: any) {
            console.error('WebContainer initialization failed:', error);
            return rejectWithValue(error.message || 'Initialization failed');
        }
    }
);

/**
 * Async thunk to update a single file (hot reload)
 */
export const updateWebContainerFile = createAsyncThunk(
    'webcontainer/updateFile',
    async ({ path, content }: { path: string; content: string }, { dispatch, rejectWithValue }) => {
        try {
            const container = await getWebContainer();
            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
            await container.fs.writeFile(cleanPath, content);
            dispatch(appendOutput(`📝 Updated: ${cleanPath}`));
            return { path: cleanPath, content };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

/**
 * Async thunk to restart dev server (after major changes)
 */
export const restartDevServer = createAsyncThunk(
    'webcontainer/restart',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setStatus({ status: 'starting', message: 'Restarting dev server...', progress: 50 }));
            dispatch(appendOutput('🔄 Restarting dev server...'));

            const container = await getWebContainer();

            // Kill existing process and restart
            const devProcess = await container.spawn('npm', ['run', 'dev']);

            devProcess.output.pipeTo(new WritableStream({
                write(data) {
                    dispatch(appendOutput(data));
                }
            }));

            return new Promise<string>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Dev server restart timeout'));
                }, 60000);

                let resolved = false;

                container.on('server-ready', (_port, url) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(timeout);
                    dispatch(appendOutput(`✅ Dev server restarted at ${url}`));
                    resolve(url);
                });

                container.on('port', (port, type, url) => {
                    if (!resolved && type === 'open' && url) {
                        resolved = true;
                        clearTimeout(timeout);
                        resolve(url);
                    }
                });
            });

        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Slice definition
const webcontainerSlice = createSlice({
    name: 'webcontainer',
    initialState,
    reducers: {
        setStatus(state, action: PayloadAction<{
            status: WebContainerState['status'];
            message?: string;
            progress?: number
        }>) {
            state.status = action.payload.status;
            if (action.payload.message) state.message = action.payload.message;
            if (action.payload.progress !== undefined) state.progress = action.payload.progress;
        },
        setPreviewUrl(state, action: PayloadAction<string | null>) {
            state.previewUrl = action.payload;
        },
        appendOutput(state, action: PayloadAction<string>) {
            // Split multi-line output and add each line
            const lines = action.payload.split('\n').filter(line => line.trim());
            state.terminalOutput.push(...lines);
            // Keep only last 100 lines to prevent memory issues
            if (state.terminalOutput.length > 100) {
                state.terminalOutput = state.terminalOutput.slice(-100);
            }
        },
        clearOutput(state) {
            state.terminalOutput = [];
        },
        setMountedFiles(state, action: PayloadAction<Record<string, string>>) {
            state.mountedFiles = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
            if (action.payload) {
                state.status = 'error';
            }
        },
        resetWebContainer(state) {
            return { ...initialState };
        },
    },
    extraReducers: (builder) => {
        builder
            // Initialize WebContainer
            .addCase(initializeWebContainer.pending, (state) => {
                state.isInitialized = false;
                state.error = null;
            })
            .addCase(initializeWebContainer.fulfilled, (state, action) => {
                state.status = 'ready';
                state.message = 'Ready!';
                state.progress = 100;
                state.previewUrl = action.payload;
                state.isInitialized = true;
                state.error = null;
            })
            .addCase(initializeWebContainer.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload as string || 'Unknown error';
                state.isInitialized = false;
            })
            // Update file
            .addCase(updateWebContainerFile.fulfilled, (state, action) => {
                state.mountedFiles[action.payload.path] = action.payload.content;
            })
            // Restart dev server
            .addCase(restartDevServer.fulfilled, (state, action) => {
                state.status = 'ready';
                state.message = 'Ready!';
                state.progress = 100;
                state.previewUrl = action.payload;
            })
            .addCase(restartDevServer.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload as string || 'Restart failed';
            });
    },
});

// Export actions
export const {
    setStatus,
    setPreviewUrl,
    appendOutput,
    clearOutput,
    setMountedFiles,
    setError,
    resetWebContainer,
} = webcontainerSlice.actions;

// Selector helpers
export const selectWebContainerStatus = (state: { webcontainer: WebContainerState }) => state.webcontainer.status;
export const selectPreviewUrl = (state: { webcontainer: WebContainerState }) => state.webcontainer.previewUrl;
export const selectTerminalOutput = (state: { webcontainer: WebContainerState }) => state.webcontainer.terminalOutput;
export const selectIsReady = (state: { webcontainer: WebContainerState }) => state.webcontainer.status === 'ready';

export default webcontainerSlice.reducer;
