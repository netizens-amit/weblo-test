// backend/src/conversation/conversation.service.ts

import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type ConversationRole = 'user' | 'assistant' | 'system';

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * 💬 ADD MESSAGE TO CONVERSATION
     */
    async addMessage(
        projectId: string,
        role: ConversationRole,
        content: string,
        metadata?: any
    ) {
        // Validate inputs
        if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
            throw new BadRequestException('Valid project ID is required for adding message');
        }

        if (!role || !['user', 'assistant', 'system'].includes(role)) {
            throw new BadRequestException('Valid role is required (user, assistant, or system)');
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new BadRequestException('Valid message content is required');
        }

        try {
            // Verify project exists
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true },
            });

            if (!project) {
                throw new NotFoundException(`Project with ID '${projectId}' not found`);
            }

            const message = await this.prisma.conversation.create({
                data: {
                    projectId,
                    role,
                    content: content.trim(),
                    metadata: metadata || undefined,
                },
            });

            this.logger.log(`💬 Added ${role} message to project ${projectId}`);
            return message;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to add conversation message: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to add message: ${error.message}`);
        }
    }

    /**
     * 📜 GET CONVERSATION HISTORY
     */
    async getConversation(projectId: string) {
        if (!projectId || typeof projectId !== 'string') {
            throw new BadRequestException('Valid project ID is required');
        }

        try {
            const messages = await this.prisma.conversation.findMany({
                where: { projectId },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    role: true,
                    content: true,
                    metadata: true,
                    createdAt: true,
                },
            });

            this.logger.log(`📜 Retrieved ${messages.length} messages for project ${projectId}`);
            return messages;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to get conversation: ${error.message}`, error.stack);
            // Return empty array for graceful degradation
            return [];
        }
    }

    /**
     * 🔍 GET SINGLE MESSAGE
     */
    async getMessage(messageId: string) {
        if (!messageId || typeof messageId !== 'string') {
            throw new BadRequestException('Valid message ID is required');
        }

        try {
            const message = await this.prisma.conversation.findUnique({
                where: { id: messageId },
            });

            if (!message) {
                throw new NotFoundException(`Message with ID '${messageId}' not found`);
            }

            return message;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to get message ${messageId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to fetch message: ${error.message}`);
        }
    }

    /**
     * 🗑️ CLEAR CONVERSATION
     */
    async clearConversation(projectId: string) {
        if (!projectId || typeof projectId !== 'string') {
            throw new BadRequestException('Valid project ID is required');
        }

        try {
            const result = await this.prisma.conversation.deleteMany({
                where: { projectId },
            });

            this.logger.log(`🗑️ Cleared ${result.count} messages for project ${projectId}`);
            return { success: true, deletedCount: result.count };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to clear conversation: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to clear conversation: ${error.message}`);
        }
    }

    /**
     * 🗑️ DELETE SINGLE MESSAGE
     */
    async deleteMessage(messageId: string) {
        if (!messageId || typeof messageId !== 'string') {
            throw new BadRequestException('Valid message ID is required');
        }

        try {
            const message = await this.prisma.conversation.findUnique({
                where: { id: messageId },
            });

            if (!message) {
                throw new NotFoundException(`Message with ID '${messageId}' not found`);
            }

            await this.prisma.conversation.delete({
                where: { id: messageId },
            });

            this.logger.log(`🗑️ Deleted message ${messageId}`);
            return { success: true, message: 'Message deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to delete message ${messageId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to delete message: ${error.message}`);
        }
    }

    /**
     * 📊 GET CONVERSATION STATS
     */
    async getConversationStats(projectId: string) {
        if (!projectId || typeof projectId !== 'string') {
            throw new BadRequestException('Valid project ID is required');
        }

        try {
            const stats = await this.prisma.conversation.groupBy({
                by: ['role'],
                where: { projectId },
                _count: true,
            });

            const totalCount = await this.prisma.conversation.count({
                where: { projectId },
            });

            const result = stats.reduce((acc, stat) => {
                acc[stat.role] = stat._count;
                return acc;
            }, {} as Record<string, number>);

            return {
                ...result,
                total: totalCount,
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to get conversation stats: ${error.message}`, error.stack);
            // Return empty stats for graceful degradation
            return { user: 0, assistant: 0, system: 0, total: 0 };
        }
    }

    /**
     * 📝 UPDATE MESSAGE
     */
    async updateMessage(messageId: string, content: string, metadata?: any) {
        if (!messageId || typeof messageId !== 'string') {
            throw new BadRequestException('Valid message ID is required');
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new BadRequestException('Valid message content is required');
        }

        try {
            const message = await this.prisma.conversation.findUnique({
                where: { id: messageId },
            });

            if (!message) {
                throw new NotFoundException(`Message with ID '${messageId}' not found`);
            }

            const updated = await this.prisma.conversation.update({
                where: { id: messageId },
                data: {
                    content: content.trim(),
                    metadata: metadata !== undefined ? metadata : message.metadata,
                },
            });

            this.logger.log(`📝 Updated message ${messageId}`);
            return updated;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to update message ${messageId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to update message: ${error.message}`);
        }
    }

    /**
     * 📜 GET RECENT MESSAGES (for context)
     */
    async getRecentMessages(projectId: string, limit: number = 10) {
        if (!projectId || typeof projectId !== 'string') {
            throw new BadRequestException('Valid project ID is required');
        }

        if (limit < 1 || limit > 100) {
            limit = 10; // Default to 10 if invalid
        }

        try {
            const messages = await this.prisma.conversation.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            });

            // Reverse to get chronological order
            return messages.reverse();
        } catch (error) {
            this.logger.error(`Failed to get recent messages: ${error.message}`, error.stack);
            return [];
        }
    }
}