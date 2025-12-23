// backend/src/modules/conversation/conversation.service.ts
// Service for managing conversation history and AI summaries

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationRole } from '@prisma/client';

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Add a message to conversation history
     */
    async addMessage(
        projectId: string,
        role: ConversationRole,
        content: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.prisma.conversation.create({
            data: {
                projectId,
                role,
                content,
                metadata: metadata || null,
            },
        });

        this.logger.debug(`💬 Added ${role} message to project ${projectId}`);

        // Check if we need to update summary
        const messageCount = await this.getMessageCount(projectId);
        if (messageCount > 5 && messageCount % 3 === 0) {
            // Don't await - update in background
            this.updateSummaryIfNeeded(projectId).catch((err) => {
                this.logger.warn(`Failed to update summary: ${err.message}`);
            });
        }
    }

    /**
     * Get all messages for a project
     */
    async getMessages(projectId: string): Promise<Array<{
        id: string;
        role: ConversationRole;
        content: string;
        createdAt: Date;
        metadata?: Record<string, any>;
    }>> {
        const messages = await this.prisma.conversation.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
        });

        return messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
            metadata: m.metadata as Record<string, any> | undefined,
        }));
    }

    /**
     * Get message count for a project
     */
    async getMessageCount(projectId: string): Promise<number> {
        return await this.prisma.conversation.count({
            where: { projectId },
        });
    }

    /**
     * Get recent messages (for context in prompts)
     */
    async getRecentMessages(projectId: string, limit = 5): Promise<string> {
        const messages = await this.prisma.conversation.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Reverse to get chronological order
        messages.reverse();

        return messages
            .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
            .join('\n\n');
    }

    /**
     * Get or create conversation summary
     */
    async getSummary(projectId: string): Promise<string | null> {
        const summary = await this.prisma.conversationSummary.findUnique({
            where: { projectId },
        });

        if (summary) {
            return summary.summary;
        }

        // If no summary but we have messages, return recent messages as context
        const recentMessages = await this.getRecentMessages(projectId);
        return recentMessages || null;
    }

    /**
     * Update conversation summary
     */
    async updateSummary(projectId: string, summary: string): Promise<void> {
        const messageCount = await this.getMessageCount(projectId);

        await this.prisma.conversationSummary.upsert({
            where: { projectId },
            create: {
                projectId,
                summary,
                messageCount,
            },
            update: {
                summary,
                messageCount,
            },
        });

        this.logger.log(`📝 Updated summary for project ${projectId}`);
    }

    /**
     * Check if summary needs update
     */
    private async updateSummaryIfNeeded(projectId: string): Promise<void> {
        const summary = await this.prisma.conversationSummary.findUnique({
            where: { projectId },
        });

        const currentMessageCount = await this.getMessageCount(projectId);

        // Update if we have 3+ new messages since last summary
        if (!summary || currentMessageCount - summary.messageCount >= 3) {
            // Get all messages for summarization
            const messages = await this.getMessages(projectId);

            // Simple summary format (could be enhanced with AI later)
            const summarizedMessages = messages.map((m) =>
                `${m.role}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`
            ).join('\n');

            const newSummary = `Conversation with ${messages.length} messages:\n${summarizedMessages}`;

            await this.updateSummary(projectId, newSummary);
        }
    }

    /**
     * Clear conversation history
     */
    async clearHistory(projectId: string): Promise<void> {
        await this.prisma.conversation.deleteMany({
            where: { projectId },
        });

        await this.prisma.conversationSummary.delete({
            where: { projectId },
        }).catch(() => {
            // Ignore if no summary exists
        });

        this.logger.log(`🗑️ Cleared conversation history for project ${projectId}`);
    }
}
