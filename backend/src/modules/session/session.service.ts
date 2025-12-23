import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Create mapping between project and OpenCode session
     */
    async createSessionMapping(
        projectId: string,
        opencodeSessionId: string,
        title: string,
        directory?: string
    ) {
        // Validate inputs
        if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
            throw new BadRequestException('Valid project ID is required for session mapping');
        }

        if (!opencodeSessionId || typeof opencodeSessionId !== 'string' || opencodeSessionId.trim().length === 0) {
            throw new BadRequestException('Valid OpenCode session ID is required for session mapping');
        }

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            throw new BadRequestException('Valid title is required for session mapping');
        }

        try {
            const mapping = await this.prisma.sessionMapping.create({
                data: {
                    projectId,
                    opencodeSessionId,
                    title,
                    directory: directory || '',
                },
            });

            this.logger.log(`✅ Session mapping created: ${projectId} -> ${opencodeSessionId}`);
            return mapping;
        } catch (error) {
            this.logger.error(`Failed to create session mapping for project ${projectId}: ${error.message}`, error.stack);

            // Check for unique constraint violation
            if (error.code === 'P2002') {
                throw new BadRequestException(`Session mapping already exists for project ${projectId}`);
            }

            throw new InternalServerErrorException(`Failed to create session mapping: ${error.message}`);
        }
    }

    /**
     * Get OpenCode session ID for project
     */
    async getSessionByProjectId(projectId: string) {
        if (!projectId || typeof projectId !== 'string') {
            this.logger.warn(`Invalid project ID provided: ${projectId}`);
            return null;
        }

        try {
            // Try sessionMapping table first
            const mapping = await this.prisma.sessionMapping.findUnique({
                where: { projectId },
            });

            if (mapping) {
                return {
                    id: mapping.id,
                    projectId: mapping.projectId,
                    opencodeSessionId: mapping.opencodeSessionId,
                    title: mapping.title,
                    directory: mapping.directory,
                };
            }

            // Fallback: Try legacy enhancedPrompt field
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: { enhancedPrompt: true },
            });

            if (!project?.enhancedPrompt) {
                return null;
            }

            try {
                const data = JSON.parse(project.enhancedPrompt);
                if (data && data.opencodeSessionId) {
                    return {
                        projectId,
                        opencodeSessionId: data.opencodeSessionId,
                        title: data.title,
                    };
                }
                return null;
            } catch {
                return null;
            }
        } catch (error) {
            this.logger.error(`Failed to get session for project ${projectId}: ${error.message}`, error.stack);
            return null;
        }
    }

    /**
     * Delete session mapping by ID
     */
    async deleteSession(id: string) {
        if (!id || typeof id !== 'string') {
            throw new BadRequestException('Valid session mapping ID is required');
        }

        try {
            // Check if session exists
            const session = await this.prisma.sessionMapping.findUnique({
                where: { id },
            });

            if (!session) {
                throw new NotFoundException(`Session mapping with ID '${id}' not found`);
            }

            await this.prisma.sessionMapping.delete({
                where: { id },
            });

            this.logger.log(`🗑️ Deleted session mapping: ${id}`);
            return { success: true, message: 'Session mapping deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to delete session mapping ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to delete session mapping: ${error.message}`);
        }
    }

    /**
     * Delete session mapping by project ID
     */
    async deleteSessionByProjectId(projectId: string) {
        if (!projectId || typeof projectId !== 'string') {
            throw new BadRequestException('Valid project ID is required');
        }

        try {
            const result = await this.prisma.sessionMapping.deleteMany({
                where: { projectId },
            });

            this.logger.log(`🗑️ Deleted ${result.count} session mapping(s) for project: ${projectId}`);
            return { success: true, deletedCount: result.count };
        } catch (error) {
            this.logger.error(`Failed to delete session mappings for project ${projectId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to delete session mappings: ${error.message}`);
        }
    }

    /**
     * Update session mapping
     */
    async updateSession(
        id: string,
        updates: { title?: string; directory?: string }
    ) {
        if (!id || typeof id !== 'string') {
            throw new BadRequestException('Valid session mapping ID is required');
        }

        try {
            const session = await this.prisma.sessionMapping.findUnique({
                where: { id },
            });

            if (!session) {
                throw new NotFoundException(`Session mapping with ID '${id}' not found`);
            }

            const updated = await this.prisma.sessionMapping.update({
                where: { id },
                data: updates,
            });

            this.logger.log(`✅ Updated session mapping: ${id}`);
            return updated;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(`Failed to update session mapping ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to update session mapping: ${error.message}`);
        }
    }

    /**
     * List all sessions for a user (via their projects)
     */
    async listSessions(userId: string) {
        if (!userId || typeof userId !== 'string') {
            throw new BadRequestException('Valid user ID is required');
        }

        try {
            // First get all project IDs for this user
            const userProjects = await this.prisma.project.findMany({
                where: { userId },
                select: { id: true },
            });

            const projectIds = userProjects.map(p => p.id);

            const sessions = await this.prisma.sessionMapping.findMany({
                where: {
                    projectId: { in: projectIds },
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return sessions;
        } catch (error) {
            this.logger.error(`Failed to list sessions for user ${userId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch sessions');
        }
    }
}
