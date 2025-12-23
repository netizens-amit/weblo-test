import { useState, useEffect, useRef } from 'react';

export interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface SSEState {
  events: SSEEvent[];
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastEvent: SSEEvent | null;
  progress: number;
  projectStatus: string;
  todos: any[];
  tokenUsage: any | null;
  thinkingMessage: string;
  streamingFiles: Record<string, string>;
}

export function useSSE(projectId: string) {
  const [state, setState] = useState<SSEState>({
    events: [],
    status: 'disconnected',
    lastEvent: null,
    progress: 0,
    projectStatus: 'idle',
    todos: [],
    tokenUsage: null,
    thinkingMessage: '',
    streamingFiles: {},
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Connect to SSE endpoint
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${base}/api/sse/${projectId}`);

    eventSourceRef.current = eventSource;

    setState((prev) => ({ ...prev, status: 'connecting' }));

    eventSource.onopen = () => {
      console.log('SSE Connected');
      setState((prev) => ({ ...prev, status: 'connected' }));
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setState((prev) => ({ ...prev, status: 'error' }));
    };

    // Handle different event types
    eventSource.addEventListener('connected', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      console.log('Connected:', data);
    });

    eventSource.addEventListener('status', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      const event: SSEEvent = {
        type: 'status',
        data,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        events: [...prev.events, event],
        lastEvent: event,
        progress: data.progress || prev.progress,
        projectStatus: data.status || prev.projectStatus,
      }));
    });

    eventSource.addEventListener('ai_thinking', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        thinkingMessage: data.message || '',
      }));
      addEvent('ai_thinking', data);
    });

    eventSource.addEventListener('todos_generated', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        todos: data.todos || [],
      }));
      addEvent('todos_generated', data);
    });


    eventSource.addEventListener('todo_updated', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map(t => t.id === data.todoId ? data.todo : t),
      }));
      addEvent('todo_updated', data);
    });

    eventSource.addEventListener('token_usage', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        tokenUsage: data,
      }));
      addEvent('token_usage', data);
    });

    eventSource.addEventListener('ai_text_chunk', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      addEvent('ai_text_chunk', data);
    });

    eventSource.addEventListener('ai_tool_use', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      addEvent('ai_tool_use', data);
    });

    eventSource.addEventListener('file_created', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      // 🆕 Track streaming files with content
      if (data.path && data.content !== undefined) {
        setState((prev) => ({
          ...prev,
          streamingFiles: {
            ...prev.streamingFiles,
            [data.path]: data.content,
          },
        }));
      }
      addEvent('file_created', data);
    });

    eventSource.addEventListener('file_updated', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      // 🆕 Update streaming files
      if (data.path && data.content !== undefined) {
        setState((prev) => ({
          ...prev,
          streamingFiles: {
            ...prev.streamingFiles,
            [data.path]: data.content,
          },
        }));
      }
      addEvent('file_updated', data);
    });

    eventSource.addEventListener('file_indexed', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      addEvent('file_indexed', data);
    });

    eventSource.addEventListener('tech_stack_detected', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      addEvent('tech_stack_detected', data);
    });

    eventSource.addEventListener('generation_completed', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        projectStatus: 'completed',
        progress: 100,
      }));
      addEvent('generation_completed', data);
    });

    eventSource.addEventListener('generation_failed', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        projectStatus: 'failed',
      }));
      addEvent('generation_failed', data);
    });

    eventSource.addEventListener('heartbeat', () => {
      // Keep connection alive
    });

    function addEvent(type: string, data: any) {
      const event: SSEEvent = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        events: [...prev.events, event],
        lastEvent: event,
      }));
    }

    // Cleanup on unmount
    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
    };
  }, [projectId]);

  return state;
}
