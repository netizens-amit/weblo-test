import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { FilesService } from './files.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*', // Allow all for dev
        credentials: true,
    },
    namespace: '/files',
})
export class FilesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(FilesGateway.name);
    private projectConnections = new Map<string, Set<string>>(); // projectId -> Set<socketId>

    constructor(
        @Inject(forwardRef(() => FilesService))
        private filesService: FilesService
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Remove from all project rooms
        for (const [projectId, sockets] of this.projectConnections.entries()) {
            if (sockets.has(client.id)) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.projectConnections.delete(projectId);
                    // Stop watching if no clients? Maybe keep it open for a bit
                }
            }
        }
    }

    /**
     * Client subscribes to project updates
     */
    @SubscribeMessage('subscribe')
    handleSubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { projectId: string; sessionId: string }
    ) {
        const { projectId, sessionId } = data;

        // Add client to project room
        client.join(`project:${projectId}`);

        if (!this.projectConnections.has(projectId)) {
            this.projectConnections.set(projectId, new Set());
        }
        this.projectConnections.get(projectId)!.add(client.id);

        // Start watching project files
        this.filesService.watchProject(projectId, sessionId);

        this.logger.log(`Client ${client.id} subscribed to project ${projectId}`);

        return { success: true, message: 'Subscribed to project updates' };
    }

    /**
     * Client unsubscribes from project
     */
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { projectId: string }
    ) {
        const { projectId } = data;

        client.leave(`project:${projectId}`);

        const connections = this.projectConnections.get(projectId);
        if (connections) {
            connections.delete(client.id);
            if (connections.size === 0) {
                this.projectConnections.delete(projectId);
            }
        }

        this.logger.log(`Client ${client.id} unsubscribed from project ${projectId}`);

        return { success: true };
    }

    /**
     * Manual file update from client
     */
    @SubscribeMessage('update_file')
    async handleUpdateFile(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            projectId: string;
            sessionId: string;
            filename: string;
            content: string;
        }
    ) {
        const { projectId, sessionId, filename, content } = data;

        try {
            await this.filesService.writeFile(projectId, sessionId, filename, content);

            // Broadcast to other clients (not sender)
            client.to(`project:${projectId}`).emit('file_updated', {
                filename,
                content,
                timestamp: new Date().toISOString(),
                source: 'client',
            });

            return { success: true };
        } catch (error) {
            this.logger.error('File update failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Emit file change to all clients in project room
     */
    emitFileChange(projectId: string, data: any) {
        if (this.server) {
            this.server.to(`project:${projectId}`).emit('file_changed', data);
        }
    }
}
