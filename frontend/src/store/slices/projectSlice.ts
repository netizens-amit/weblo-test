// frontend/src/store/slices/projectSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiInstance, getErrorMessage } from '../../lib/axios';

// --- Types ---

export interface Project {
    id: string;
    name: string;
    originalPrompt: string;
    preferences?: any; // NEW: Store user preferences
    status: 'PENDING' | 'ENHANCING_PROMPT' | 'GENERATING_CODE' | 'COMPLETED' | 'FAILED';
    progress: number;
    htmlContent?: string;
    cssContent?: string;
    jsContent?: string;
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

// 🆕 UPDATED: Accept preferences parameter
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
                preferences // Send preferences to backend
            });
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const updateProject = createAsyncThunk(
    'project/update',
    async ({ id, data }: { id: string; data: Partial<Project> & { changeReason?: string } }, { rejectWithValue }) => {
        try {
            const response = await apiInstance.patch(`/projects/${id}`, data);
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const refineProject = createAsyncThunk(
    'project/refine',
    async ({ id, prompt }: { id: string; prompt: string }, { rejectWithValue }) => {
        try {
            // Use longer timeout for refinements (5 minutes)
            const response = await apiInstance.post(
                `/projects/${id}/refine`,
                { prompt },
                { timeout: 300000 }  // 5 minute timeout for refinements
            );
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

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

export const fetchProjectFiles = createAsyncThunk(
    'project/fetchFiles',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const response = await apiInstance.get(`/projects/${projectId}/files`);
            return response.data.data?.files || response.data.files || [];
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

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

export const fetchConversation = createAsyncThunk(
    'project/fetchConversation',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const response = await apiInstance.get(`/projects/${projectId}/conversation`);
            return response.data.data || response.data || { messages: [] };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const clearConversation = createAsyncThunk(
    'project/clearConversation',
    async (projectId: string, { rejectWithValue }) => {
        try {
            await apiInstance.post(`/projects/${projectId}/conversation/clear`);
            return projectId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// --- Slice ---

const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        resetCurrentProject: (state) => {
            state.currentProject = null;
            state.files = [];
            state.conversation = [];
        },
        addMessageToConversation: (state, action: PayloadAction<ConversationMessage>) => {
            state.conversation.push(action.payload);
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
                state.currentProject = action.payload;
                const index = state.projects.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.projects[index] = action.payload;
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

        // Fetch Conversation
        builder.addCase(fetchConversation.fulfilled, (state, action) => {
            state.conversation = action.payload.messages || [];
        });

        // Clear Conversation
        builder.addCase(clearConversation.fulfilled, (state) => {
            state.conversation = [];
        });
    },
});

export const { clearError, resetCurrentProject, addMessageToConversation } = projectSlice.actions;
export default projectSlice.reducer;
