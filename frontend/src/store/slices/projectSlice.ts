// frontend/src/store/slices/projectSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiInstance, getErrorMessage } from '../../lib/axios';

// --- Types ---

export interface Project {
    id: string;
    name: string;
    originalPrompt: string;
    preferences?: any;
    status: 'PENDING' | 'ENHANCING_PROMPT' | 'GENERATING_CODE' | 'COMPLETED' | 'FAILED';
    progress: number;
    htmlContent?: string;
    cssContent?: string;
    jsContent?: string;
    sessionId?: string; // OpenCode session ID
    createdAt: string;
    updatedAt: string;
    versions?: Version[];
}

export interface Version {
    id: string;
    versionNumber: number;
    createdAt: string;
    changeReason: string;
}

export interface ProjectFile {
    name: string;
    path: string;
    content?: string;
    type: 'file' | 'directory';
    children?: ProjectFile[];
}

export interface ConversationMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: string;
}

interface ProjectState {
    projects: Project[];
    currentProject: Project | null;
    files: ProjectFile[];
    conversation: ConversationMessage[];
    loading: boolean;
    operationLoading: boolean;
    error: string | null;
}

const initialState: ProjectState = {
    projects: [],
    currentProject: null,
    files: [],
    conversation: [],
    loading: false,
    operationLoading: false,
    error: null,
};

// --- Async Thunks ---

/**
 * 📋 FETCH ALL PROJECTS
 */
export const fetchProjects = createAsyncThunk(
    'project/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiInstance.get('/projects');
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 🔍 FETCH SINGLE PROJECT
 */
export const fetchProject = createAsyncThunk(
    'project/fetchOne',
    async (id: string, { rejectWithValue }) => {
        try {
            if (!id) throw new Error('Project ID is required');
            const response = await apiInstance.get(`/projects/${id}`);
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * ✨ CREATE NEW PROJECT
 * Creates project in DB, generation happens via SSE stream
 */
export const createProject = createAsyncThunk(
    'project/create',
    async ({
        name,
        prompt,
        preferences
    }: {
        name: string;
        prompt: string;
        preferences?: any;
    }, { rejectWithValue }) => {
        try {
            const response = await apiInstance.post('/projects', {
                name,
                prompt,
                preferences
            });

            const project = response.data.data || response.data;

            // NOTE: Generation will happen via SSE stream in EditorPage
            // This just creates the project record
            return project;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 📝 UPDATE PROJECT METADATA
 * For updating project details (not code generation)
 */
export const updateProject = createAsyncThunk(
    'project/update',
    async ({
        id,
        data
    }: {
        id: string;
        data: Partial<Project> & { changeReason?: string }
    }, { rejectWithValue }) => {
        try {
            const response = await apiInstance.patch(`/projects/${id}`, data);
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 🔄 REFINE PROJECT (Legacy - for backwards compatibility)
 * New refinements should use SSE stream directly
 * This is kept for API compatibility with existing code
 */
export const refineProject = createAsyncThunk(
    'project/refine',
    async ({ id, prompt }: { id: string; prompt: string }, { rejectWithValue }) => {
        try {
            // Check if new SSE endpoint exists, otherwise use legacy
            const response = await apiInstance.post(
                `/projects/${id}/refine`,
                { prompt },
                { timeout: 300000 }
            );
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 🗑️ DELETE PROJECT
 */
export const deleteProject = createAsyncThunk(
    'project/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await apiInstance.delete(`/projects/${id}`);
            return { id, ...response.data };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 📁 FETCH PROJECT FILES
 * Gets files from WebContainer/OpenCode session
 */
export const fetchProjectFiles = createAsyncThunk(
    'project/fetchFiles',
    async (projectId: string) => {
        try {
            const response = await apiInstance.get(`/projects/${projectId}/files`);
            const files = response.data.data?.files || response.data.files || response.data;

            // Handle both flat array and nested structure
            return Array.isArray(files) ? files : [];
        } catch (error) {
            console.warn('Failed to fetch project files:', error);
            // Don't reject, just return empty array for graceful degradation
            return [];
        }
    }
);

/**
 * ⏮️ RESTORE VERSION
 */
export const restoreVersion = createAsyncThunk(
    'project/restoreVersion',
    async ({ id, versionNumber }: { id: string; versionNumber: number }, { rejectWithValue }) => {
        try {
            const response = await apiInstance.post(`/projects/${id}/versions/${versionNumber}/restore`);
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 💬 FETCH CONVERSATION HISTORY
 * New: Uses /conversation/:projectId endpoint
 */
export const fetchConversation = createAsyncThunk(
    'project/fetchConversation',
    async (projectId: string) => {
        try {
            // Try new conversation endpoint first
            let response;
            try {
                response = await apiInstance.get(`/conversation/${projectId}`);
            } catch (e) {
                // Fallback to old endpoint for backwards compatibility
                response = await apiInstance.get(`/projects/${projectId}/conversation`);
            }

            const data = response.data.data || response.data;

            // Handle different response formats
            if (Array.isArray(data)) {
                return { messages: data };
            }

            return {
                messages: data.messages || []
            };
        } catch (error) {
            console.warn('Failed to fetch conversation:', error);
            // Don't reject, return empty for graceful degradation
            return { messages: [] };
        }
    }
);

/**
 * 🗑️ CLEAR CONVERSATION
 */
export const clearConversation = createAsyncThunk(
    'project/clearConversation',
    async (projectId: string, { rejectWithValue }) => {
        try {
            // Try new endpoint
            try {
                await apiInstance.delete(`/conversation/${projectId}`);
            } catch (e) {
                // Fallback to old endpoint
                await apiInstance.post(`/projects/${projectId}/conversation/clear`);
            }
            return projectId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * 💬 ADD MESSAGE TO CONVERSATION
 * New: Directly call conversation API
 */
export const addConversationMessage = createAsyncThunk(
    'project/addMessage',
    async ({
        projectId,
        role,
        content
    }: {
        projectId: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
    }) => {
        try {
            const response = await apiInstance.post(`/conversation/${projectId}/messages`, {
                role,
                content
            });
            return response.data.data || response.data;
        } catch (error) {
            console.warn('Failed to save message to conversation:', error);
            // Return message anyway for optimistic UI update
            return { role, content, createdAt: new Date().toISOString() };
        }
    }
);

// --- Slice ---

const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        /**
         * Clear error state
         */
        clearError: (state) => {
            state.error = null;
        },

        /**
         * Reset current project (when navigating away)
         */
        resetCurrentProject: (state) => {
            state.currentProject = null;
            state.files = [];
            state.conversation = [];
        },

        /**
         * Add message to conversation (optimistic update)
         */
        addMessageToConversation: (state, action: PayloadAction<ConversationMessage>) => {
            state.conversation.push(action.payload);
        },

        /**
         * Update project status (for SSE updates)
         */
        updateProjectStatus: (state, action: PayloadAction<{
            projectId: string;
            status: Project['status'];
            progress?: number;
        }>) => {
            const { projectId, status, progress } = action.payload;

            // Update current project
            if (state.currentProject?.id === projectId) {
                state.currentProject.status = status;
                if (progress !== undefined) {
                    state.currentProject.progress = progress;
                }
            }

            // Update in projects list
            const index = state.projects.findIndex(p => p.id === projectId);
            if (index !== -1) {
                state.projects[index].status = status;
                if (progress !== undefined) {
                    state.projects[index].progress = progress;
                }
            }
        },

        /**
         * Update files (for streaming updates)
         */
        updateFiles: (state, action: PayloadAction<Record<string, string>>) => {
            // Convert object to file array
            const filesObj = action.payload;
            const newFiles: ProjectFile[] = Object.entries(filesObj).map(([path, content]) => ({
                name: path.split('/').pop() || path,
                path,
                content,
                type: 'file' as const,
            }));

            state.files = newFiles;
        },

        /**
         * Add single file (for incremental updates)
         */
        addFile: (state, action: PayloadAction<{ path: string; content: string }>) => {
            const { path, content } = action.payload;
            const existingIndex = state.files.findIndex(f => f.path === path);

            const newFile: ProjectFile = {
                name: path.split('/').pop() || path,
                path,
                content,
                type: 'file',
            };

            if (existingIndex !== -1) {
                state.files[existingIndex] = newFile;
            } else {
                state.files.push(newFile);
            }
        },
    },
    extraReducers: (builder) => {
        // Fetch Projects
        builder.addCase(fetchProjects.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchProjects.fulfilled, (state, action) => {
            state.loading = false;
            state.projects = action.payload;
        });
        builder.addCase(fetchProjects.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // Fetch Single Project
        builder.addCase(fetchProject.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchProject.fulfilled, (state, action) => {
            state.loading = false;
            state.currentProject = action.payload;
        });
        builder.addCase(fetchProject.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // Create Project
        builder.addCase(createProject.pending, (state) => {
            state.operationLoading = true;
            state.error = null;
        });
        builder.addCase(createProject.fulfilled, (state, action) => {
            state.operationLoading = false;
            state.projects.unshift(action.payload);
            state.currentProject = action.payload;
        });
        builder.addCase(createProject.rejected, (state, action) => {
            state.operationLoading = false;
            state.error = action.payload as string;
        });

        // Update Project / Refine Project / Restore Version
        const updateProjectHandlers = [updateProject, refineProject, restoreVersion];
        updateProjectHandlers.forEach(thunk => {
            builder.addCase(thunk.pending, (state) => {
                state.operationLoading = true;
                state.error = null;
            });
            builder.addCase(thunk.fulfilled, (state, action) => {
                state.operationLoading = false;

                const updatedProject = action.payload.project || action.payload;

                state.currentProject = updatedProject;
                const index = state.projects.findIndex(p => p.id === updatedProject.id);
                if (index !== -1) {
                    state.projects[index] = updatedProject;
                }
            });
            builder.addCase(thunk.rejected, (state, action) => {
                state.operationLoading = false;
                state.error = action.payload as string;
            });
        });

        // Delete Project
        builder.addCase(deleteProject.pending, (state) => {
            state.operationLoading = true;
            state.error = null;
        });
        builder.addCase(deleteProject.fulfilled, (state, action) => {
            state.operationLoading = false;
            state.projects = state.projects.filter(p => p.id !== action.payload.id);
            if (state.currentProject?.id === action.payload.id) {
                state.currentProject = null;
                state.files = [];
                state.conversation = [];
            }
        });
        builder.addCase(deleteProject.rejected, (state, action) => {
            state.operationLoading = false;
            state.error = action.payload as string;
        });

        // Fetch Files
        builder.addCase(fetchProjectFiles.fulfilled, (state, action) => {
            state.files = action.payload;
        });
        builder.addCase(fetchProjectFiles.rejected, (state) => {
            // Don't set error, just keep existing files
            state.files = [];
        });

        // Fetch Conversation
        builder.addCase(fetchConversation.fulfilled, (state, action) => {
            state.conversation = action.payload.messages || [];
        });
        builder.addCase(fetchConversation.rejected, (state) => {
            // Don't set error, just keep empty conversation
            state.conversation = [];
        });

        // Clear Conversation
        builder.addCase(clearConversation.fulfilled, (state) => {
            state.conversation = [];
        });

        // Add Message
        builder.addCase(addConversationMessage.fulfilled, (state, action) => {
            // Check if message already exists (optimistic update)
            const exists = state.conversation.some(
                m => m.content === action.payload.content && m.role === action.payload.role
            );

            if (!exists) {
                state.conversation.push(action.payload);
            }
        });
    },
});

export const {
    clearError,
    resetCurrentProject,
    addMessageToConversation,
    updateProjectStatus,
    updateFiles,
    addFile,
} = projectSlice.actions;

export default projectSlice.reducer;
