import {
    Processor,
    Process,
    OnQueueActive,
    OnQueueCompleted,
    OnQueueFailed,
    OnQueueStalled
} from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import {
    GENERATION_QUEUE,
    GenerationJobData,
    GenerationJobProgress,
    GenerationJobResult
} from './generation.queue';
import { OpencodeService } from '../modules/opencode/opencode.service';
import { SessionService } from '../modules/session/session.service';
import { SseService } from '../modules/sse/sse.service';
import { FilesService } from '../modules/files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';

@Processor(GENERATION_QUEUE)
export class GenerationProcessor {
    private readonly logger = new Logger(GenerationProcessor.name);

    constructor(
        @Inject(forwardRef(() => OpencodeService))
        private readonly opencode: OpencodeService,

        @Inject(forwardRef(() => SessionService))
        private readonly sessionService: SessionService,

        @Inject(forwardRef(() => SseService))
        private readonly sse: SseService,

        @Inject(forwardRef(() => FilesService))
        private readonly filesService: FilesService,

        private readonly prisma: PrismaService,
    ) { }

    @Process()
    async handleGeneration(job: Job<GenerationJobData>): Promise<GenerationJobResult> {
        const { projectId, userId, projectName, prompt, preferences } = job.data;
        const startTime = Date.now();

        this.logger.log(`🚀 Processing job ${job.id} for project ${projectId}`);

        try {
            // create session
            await this.updateProgress(job, {
                status: 'creating_session',
                progress: 10,
                currentStep: 'Creating OpenCode session...',
            });

            const session = await this.opencode.createSession(projectId, projectName);
            await this.sessionService.createSessionMapping(projectId, session.id, projectName);

            // 🆕 Start file watcher IMMEDIATELY so files stream in real-time during generation
            this.filesService.watchProject(projectId, session.id);
            this.logger.log(`👁️ Started file watcher for real-time streaming`);

            // initialize todos
            await this.updateProgress(job, {
                status: 'generating',
                progress: 20,
                currentStep: 'Starting AI generation...',
            });

            // generateTodos already stores todos internally, no need for separate initialization
            await this.sse.generateTodos(projectId, prompt);

            // generate code
            await this.updateProgress(job, {
                status: 'generating',
                progress: 30,
                currentStep: 'Generating code with AI...',
            });

            const result = await this.opencode.generateWebsite(
                session.id,
                projectId,
                prompt,
                null,
                preferences,
            );

            // update progress
            await this.updateProgress(job, {
                status: 'saving_files',
                progress: 90,
                currentStep: 'Saving generated files...',
                filesGenerated: result.files,
            });

            // complete
            const totalTime = Date.now() - startTime;

            const aiModel = process.env.AI_MODEL || 'grok-code';
            const aiProvider = process.env.AI_PROVIDER || 'opencode';
            const tokenUsage = (result as any).tokenUsage;

            await this.prisma.project.update({
                where: { id: projectId },
                data: {
                    status: ProjectStatus.COMPLETED,
                    progress: 100,
                    aiModel: aiModel,
                    generationTimeMs: totalTime,
                    tokensUsed: tokenUsage?.totalTokens || 0,
                    estimatedCost: tokenUsage?.cost || 0,
                },
            });

            await this.updateProgress(job, {
                status: 'completed',
                progress: 100,
                currentStep: 'Generation complete!',
                filesGenerated: result.files,
                tokenUsage,
            });

            // Emit SSE event for connected clients
            this.sse.emitEvent(projectId, 'generation_completed', {
                projectId,
                sessionId: session.id,
                generationTime: totalTime,
                files: result.files,
                tokenUsage,
                aiModel,
                aiProvider,
            });

            this.logger.log(`✅ Job ${job.id} completed in ${totalTime}ms`);

            return {
                success: true,
                files: result.files,
                sessionId: session.id,
                generationTimeMs: totalTime,
            };

        } catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);

            await this.updateProgress(job, {
                status: 'failed',
                progress: 0,
                error: error.message,
            });

            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: ProjectStatus.FAILED },
            });

            this.sse.emitEvent(projectId, 'generation_error', {
                error: error.message
            });

            throw error;
        }
    }

    private async updateProgress(job: Job, progress: GenerationJobProgress) {
        // Update Bull job progress (persisted in Redis)
        await job.progress(progress);

        // Emit via SSE for connected clients
        const projectId = job.data.projectId;
        this.sse.emitEvent(projectId, 'job_progress', progress);

        // Also update database for persistence
        await this.prisma.project.update({
            where: { id: projectId },
            data: {
                progress: progress.progress,
                status: this.mapStatus(progress.status),
            },
        });
    }

    private mapStatus(status: string): ProjectStatus {
        const statusMap: Record<string, ProjectStatus> = {
            'pending': ProjectStatus.PENDING,
            'creating_session': ProjectStatus.GENERATING_CODE,
            'generating': ProjectStatus.GENERATING_CODE,
            'saving_files': ProjectStatus.GENERATING_CODE,
            'completed': ProjectStatus.COMPLETED,
            'failed': ProjectStatus.FAILED,
        };
        return statusMap[status] || ProjectStatus.PENDING;
    }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.log(`Job ${job.id} started for project ${job.data.projectId}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: GenerationJobResult) {
        this.logger.log(`Job ${job.id} completed: ${result.files?.length || 0} files`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`);
    }

    @OnQueueStalled()
    onStalled(job: Job) {
        this.logger.warn(`Job ${job.id} stalled, may be retried`);
    }
}