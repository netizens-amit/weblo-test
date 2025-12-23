// frontend/src/pages/EditorPage.tsx (WITH WEBCONTAINER PREVIEW)

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { api } from '@/lib/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProject, fetchProjectFiles, updateProject, refineProject, fetchConversation } from '@/store/slices/projectSlice';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useSSE } from '@/hooks/useSSE';
import { useWebSocket } from '@/hooks/useWebSocket';
import ChatPanel from '@/components/editor/ChatPanel';
import WebContainerPreview from '@/components/editor/WebContainerPreview';  // ✅ NEW
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  type: 'user' | 'system' | 'step';
  content: string;
  stepTitle?: string;
  isComplete?: boolean;
}

export function EditorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentProject } = useAppSelector((state) => state.project);
  // const [project, setProject] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // 🔗 SSE CONNECTION
  const {
    progress,
    projectStatus,
    lastEvent,
    todos,
    tokenUsage,
    thinkingMessage,
    status: sseStatus,
    streamingFiles,  // 🆕 Files streamed during generation
  } = useSSE(projectId || '');

  // 🔌 WEBSOCKET CONNECTION
  const wsEnabled = Boolean(sessionId && projectId);
  const { isConnected, files: wsFiles, lastChange, updateFile } = useWebSocket(
    wsEnabled ? projectId! : '',
    wsEnabled ? sessionId : ''
  );

  const hasLoadedFiles = useRef(false);
  const filesLoadAttempts = useRef(0);
  const maxLoadAttempts = 10;

  // 🆕 SYNC STREAMING FILES (real-time during generation)
  useEffect(() => {
    if (Object.keys(streamingFiles).length > 0) {
      console.log('📡 Streaming files received:', Object.keys(streamingFiles));
      setFiles((prev) => ({ ...prev, ...streamingFiles }));
      setIsInitialLoad(false);
    }
  }, [streamingFiles]);

  // ✅ EXTRACT SESSION ID FROM SSE
  useEffect(() => {
    if (lastEvent?.type === 'generation_completed') {
      const sid = lastEvent.data?.sessionId;
      if (sid && sid !== sessionId) {
        console.log('✅ Session ID from SSE:', sid);
        setSessionId(sid);
        loadProjectFiles(); // Immediately load files
      }
    }
  }, [lastEvent]);

  // 🔄 SYNC WEBSOCKET FILES
  const syncWebSocketFiles = useCallback(
    debounce((wsFiles: Record<string, string>) => {
      if (Object.keys(wsFiles).length > 0 && !isInitialLoad) {
        console.log('🔄 Syncing WebSocket files:', Object.keys(wsFiles));
        setFiles((prev) => ({ ...prev, ...wsFiles }));
      }
    }, 500),
    [isInitialLoad]
  );

  useEffect(() => {
    syncWebSocketFiles(wsFiles);
  }, [wsFiles, syncWebSocketFiles]);

  // 📡 HANDLE FILE CHANGES FROM SERVER
  useEffect(() => {
    if (lastChange && lastChange.source !== 'client') {
      console.log('📡 Server file change:', lastChange.filename);
      setFiles((prev) => ({
        ...prev,
        [lastChange.filename]: lastChange.content,
      }));
    }
  }, [lastChange]);

  // 🎯 LOAD PROJECT DATA + CONVERSATION
  useEffect(() => {
    if (projectId) {
      loadProject();
      loadConversation();  // ✅ NEW: Load conversation history
    }
  }, [projectId]);

  // 🔌 WEBSOCKET READY → LOAD FILES
  useEffect(() => {
    if (isConnected && sessionId && !hasLoadedFiles.current) {
      console.log('🔌 WebSocket connected, loading files...');
      loadProjectFiles();
      hasLoadedFiles.current = true;
    }
  }, [isConnected, sessionId]);

  // ⏰ PERIODIC FILE REFRESH (UNTIL FILES LOADED)
  useEffect(() => {
    if (
      projectStatus === 'completed' &&
      Object.keys(files).length === 0 &&
      filesLoadAttempts.current < maxLoadAttempts
    ) {
      const interval = setInterval(() => {
        console.log(`🔄 Retry loading files (attempt ${filesLoadAttempts.current + 1})...`);
        loadProjectFiles();
        filesLoadAttempts.current++;

        if (filesLoadAttempts.current >= maxLoadAttempts) {
          clearInterval(interval);
          setLoadError('Failed to load project files after multiple attempts');
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [projectStatus, files]);

  // 📂 LOAD PROJECT METADATA
  const loadProject = async () => {
    try {
      setLoadError(null);
      // const data = await api.getProject(projectId!);
      const data = await dispatch(fetchProject(projectId!)).unwrap();
      // setProject(data); // Using Redux state instead, but maintaining local sync if needed or relying on selector
      // NOTE: We'll rely on currentProject from Redux for rendering, but extracting local vars below
      // actually, the formatted data is used for sessionId logic.

      // Extract session ID
      let sid = data.sessionId;

      if (!sid && data.enhancedPrompt) {
        try {
          const parsed = JSON.parse(data.enhancedPrompt);
          sid = parsed.opencodeSessionId;
        } catch (e) {
          console.warn('Failed to parse enhancedPrompt');
        }
      }

      if (sid) {
        console.log('✅ Session ID from project:', sid);
        setSessionId(sid);
      }

      // Note: Conversation will be loaded separately
      // Only show success if there are no conversation messages yet
      if (data.status === 'COMPLETED' && messages.length === 0) {
        // Will be populated by loadConversation
      }
    } catch (error: any) {
      console.error('❌ Failed to load project:', error);
      const msg = typeof error === 'string' ? error : error.message || 'Failed to load project';
      setLoadError(msg);
    }
  };

  // 📁 LOAD PROJECT FILES
  const loadProjectFiles = async () => {
    if (!projectId) return;

    try {
      // const filesArray = await api.getProjectFiles(projectId);
      const filesArray = await dispatch(fetchProjectFiles(projectId)).unwrap();
      const loadedFiles: Record<string, string> = {};

      // Handle both recursive file structure or flat list depending on what API returns
      // The previous code assumed a flat list with filename and content.
      // We'll traverse if it's nested (ProjectFile type) or use as is if flat.
      // Assuming it returns the same shape as before for now.

      const processFiles = (list: any[]) => {
        for (const file of list) {
          if (file.type === 'file' && file.content !== undefined) {
            // API might return 'name' or 'filename'. Previous code used 'filename'.
            // projectSlice types usage 'name' and 'path'.
            // Let's check what backend sends. Backend files.service uses 'name' and 'path' recursion.
            // But existing frontend code used 'filename'.
            // We'll support both to be safe during transition.
            const path = file.filename || file.path;
            if (path) loadedFiles[path] = file.content;
          } else if (file.filename && file.content !== undefined) {
            loadedFiles[file.filename] = file.content;
          }

          if (file.children && Array.isArray(file.children)) {
            processFiles(file.children);
          }
        }
      }

      // If existing code treated it as flat list of {filename, content}, let's stick to that if possible
      // but if the API returns a tree (checked files.service), we need recursion.
      // However, files.service.ts sends 'files' array.
      // Let's iterate.
      processFiles(filesArray);

      if (Object.keys(loadedFiles).length > 0) {
        console.log('✅ Loaded files:', Object.keys(loadedFiles));
        setFiles(loadedFiles);
        setIsInitialLoad(false);
        setLoadError(null);
      } else {
        console.warn('⚠️ No files returned from API');
      }
    } catch (error: any) {
      console.error('❌ Failed to load files:', error);
      // Don't set error here, let retry mechanism handle it
    }
  };

  // 💬 LOAD CONVERSATION HISTORY (NEW)
  const loadConversation = async () => {
    if (!projectId) return;

    try {
      // const response = await api.getConversation(projectId);
      const response = await dispatch(fetchConversation(projectId)).unwrap();
      const conversationMessages = response.messages || response || []; // Handle various structures

      if (conversationMessages.length > 0) {
        // Convert DB messages to UI format
        const formattedMessages: Message[] = conversationMessages.map((msg: any) => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'system',
          content: msg.content,
          stepTitle: msg.role === 'assistant' ? '✨ AI Response' : undefined,
          isComplete: true,
        }));

        console.log('💬 Loaded conversation:', formattedMessages.length, 'messages');
        setMessages(formattedMessages);
      } else {
        // No conversation yet, show default success message if completed
        if (currentProject?.status === 'COMPLETED') {
          // use currentProject from Redux
          setMessages([
            {
              id: 'success',
              type: 'system',
              stepTitle: '🎉 React App Ready!',
              content: 'Your application has been generated successfully.',
              isComplete: true,
            },
          ]);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load conversation:', error);
      // Fallback: show default message
    }
  };

  // 💾 SAVE FILES
  const handleSave = useCallback(async () => {
    if (!projectId) return;

    setIsSaving(true);
    try {
      await dispatch(updateProject({
        id: projectId,
        data: {
          htmlContent: files['src/App.jsx'] || '',
          cssContent: files['src/index.css'] || '',
          jsContent: files['src/main.jsx'] || '',
          changeReason: 'manual_edit',
        }
      })).unwrap();

      setIsDirty(false);
      console.log('✅ Files saved');
    } catch (error) {
      console.error('❌ Save failed:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, files, dispatch]);

  // ✏️ CODE CHANGE HANDLER
  const debouncedUpdateFile = useCallback(
    debounce((filename: string, content: string) => {
      if (isConnected) {
        updateFile(filename, content);
      }
    }, 1000),
    [updateFile, isConnected]
  );

  const handleCodeChange = (filename: string, content: string) => {
    setFiles((prev) => ({
      ...prev,
      [filename]: content,
    }));

    debouncedUpdateFile(filename, content);
    setIsDirty(true);
  };

  // 💬 SEND REFINEMENT MESSAGE
  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: 'user',
        content: message,
      },
    ]);

    setIsRefining(true);

    try {
      const result = await dispatch(refineProject({ id: projectId!, prompt: message })).unwrap();

      if (result.files || true) { // Assume success usually means new files or updates
        // Reload all files
        await loadProjectFiles();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          type: 'system',
          stepTitle: '✨ Changes Applied',
          content: 'AI has updated your React components.',
          isComplete: true,
        },
      ]);
    } catch (err: any) {
      console.error('❌ Refine failed:', err);
      const msg = typeof err === 'string' ? err : err.message || 'Failed to apply changes. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: 'system',
          stepTitle: '❌ Error',
          content: msg,
        },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  // 🔄 RETRY LOADING
  const handleRetry = () => {
    setIsRetrying(true);
    setLoadError(null);
    filesLoadAttempts.current = 0;
    loadProject();
    loadProjectFiles();
    setTimeout(() => setIsRetrying(false), 2000);
  };

  // 📊 STATUS CHECKS
  const isProjectCompleted =
    currentProject?.status === 'COMPLETED' ||
    projectStatus === 'completed' ||
    projectStatus === 'COMPLETED';

  const isProjectFailed =
    currentProject?.status === 'FAILED' ||
    projectStatus === 'failed' ||
    projectStatus === 'FAILED' ||
    sseStatus === 'error';

  const isLoading = !currentProject && !loadError;
  const isGenerating =
    !isProjectCompleted &&
    !isProjectFailed &&
    (projectStatus === 'GENERATING_CODE' ||
      projectStatus === 'ENHANCING_PROMPT' ||
      projectStatus === 'PENDING');

  const hasFiles = Object.keys(files).length > 0;

  // 🎨 RENDER: LOADING STATE
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading project...</p>
        </div>
      </div>
    );
  }

  // 🎨 RENDER: ERROR STATE
  if (loadError && !isProjectCompleted) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Failed to Load Project</h3>
          <p className="text-slate-400 mb-6">{loadError}</p>
          <Button onClick={handleRetry} disabled={isRetrying} className="bg-blue-600">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  // 🎨 RENDER: MAIN EDITOR
  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <PanelGroup direction="horizontal" className="flex-1">
        {/* 💬 LEFT: CHAT PANEL */}
        <Panel defaultSize={35} minSize={25} maxSize={50} className="flex flex-col">
          <ChatPanel
            projectName={currentProject?.name || 'New React App'}
            originalPrompt={currentProject?.originalPrompt || ''}
            messages={messages}
            isGenerating={isGenerating || isRefining}
            progress={progress}
            onSendMessage={handleSendMessage}
            onBack={() => navigate('/projects')}
            todos={todos}
            tokenUsage={tokenUsage}
            thinkingMessage={thinkingMessage}
            streamingFiles={streamingFiles}  // 🆕 Live file creation
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-blue-500 transition-colors" />

        {/* 🖼️ RIGHT: PREVIEW PANEL */}
        <Panel defaultSize={65} minSize={40} className="flex flex-col">
          {/* Show loading state while generating, even if some files exist */}
          {isGenerating ? (
            <div className="h-full flex items-center justify-center bg-slate-900">
              <div className="text-center max-w-md px-6">
                <div className="relative mb-6">
                  <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto" />
                </div>
                <h3 className="text-white text-xl font-medium mb-2">Generating Your Website</h3>
                <p className="text-slate-400 text-sm mb-4">
                  {thinkingMessage || "AI is creating your components..."}
                </p>
                {progress > 0 && (
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <p className="text-slate-500 text-xs">
                  {Object.keys(files).length} files created
                </p>
              </div>
            </div>
          ) : hasFiles ? (
            <WebContainerPreview
              files={files}
              title={currentProject?.name || 'New Website'}
              onSave={handleSave}
              onCodeChange={handleCodeChange}
              isSaving={isSaving}
              isDirty={isDirty}
              isRefining={isRefining}
            />
          ) : isProjectFailed ? (
            <div className="h-full flex items-center justify-center bg-slate-900">
              <div className="text-center max-w-md px-6">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-white text-xl font-medium mb-2">Generation Failed</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {lastEvent?.data?.error || 'An error occurred during code generation.'}
                </p>
                <Button onClick={() => navigate('/projects')} variant="outline">
                  Back to Projects
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-900">
              <div className="text-center max-w-md px-6">
                <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4 opacity-50" />
                <h3 className="text-white text-xl font-medium mb-2">
                  {isProjectCompleted ? 'Loading Files...' : 'Generating React App...'}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {thinkingMessage || 'OpenCode is creating your React project...'}
                </p>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2 text-right">{progress}%</p>

                {isProjectCompleted && !hasFiles && (
                  <Button onClick={handleRetry} variant="outline" className="mt-4" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Files
                  </Button>
                )}
              </div>
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default EditorPage;