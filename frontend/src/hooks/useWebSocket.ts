import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface FileChange {
    filename: string;
    content: string;
    timestamp: string;
    isNew?: boolean;
    source?: string;
}

export function useWebSocket(projectId: string, sessionId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [files, setFiles] = useState<Record<string, string>>({});  // ✅ KEEP THIS
    const [lastChange, setLastChange] = useState<FileChange | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!projectId || !sessionId) {
            console.warn('⚠️ Missing projectId or sessionId for WebSocket');
            return;
        }

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        console.log('🔌 Connecting to WebSocket:', `${baseUrl}/files`);

        const socket = io(`${baseUrl}/files`, {
            transports: ['websocket'],
            withCredentials: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            socket.emit('subscribe', { projectId, sessionId });
        });

        socket.on('file_changed', (data: FileChange) => {
            console.log('📄 File changed:', data.filename);
            setFiles(prev => ({ ...prev, [data.filename]: data.content }));
            setLastChange(data);
        });

        socket.on('file_updated', (data: FileChange) => {
            console.log('📝 File updated:', data.filename);
            setFiles(prev => ({ ...prev, [data.filename]: data.content }));
            setLastChange(data);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('unsubscribe', { projectId });
                socketRef.current.disconnect();
            }
        };
    }, [projectId, sessionId]);

    const updateFile = (filename: string, content: string) => {
        if (!socketRef.current) return;
        socketRef.current.emit('update_file', {
            projectId,
            sessionId,
            filename,
            content,
        });
        setFiles(prev => ({ ...prev, [filename]: content }));
    };

    return {
        isConnected,
        files,        // ✅ RETURN FILES
        lastChange,
        updateFile,
    };
}
