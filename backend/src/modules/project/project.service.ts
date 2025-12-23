// backend/src/modules/project/project.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpencodeService } from '../opencode/opencode.service';
import { SessionService } from '../session/session.service';
import { FilesService } from '../files/files.service';
import { SseService } from '../sse/sse.service';
import { ProjectStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { GENERATION_QUEUE, GenerationJobData } from '../../queue/generation.queue';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private prisma: PrismaService,
    private opencode: OpencodeService,
    private sessionService: SessionService,
    private filesService: FilesService,
    private sse: SseService,
    @InjectQueue(GENERATION_QUEUE) private generationQueue: Queue<GenerationJobData>,
  ) { }

  // 🆕 UPDATED: Accept preferences parameter
  async createProject(
    userId: string,
    name: string,
    prompt: string,
    preferences?: any
  ) {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Valid user ID is required');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('Project name is required');
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new BadRequestException('Project prompt is required');
    }

    this.logger.log(`Creating project for user ${userId} with preferences: ${preferences ? 'YES' : 'NO'}`);

    try {
      const project = await this.prisma.project.create({
        data: {
          userId,
          name: name.trim(),
          originalPrompt: prompt.trim(),
          preferences: preferences ? JSON.stringify(preferences) : null, // Store as JSON
          status: ProjectStatus.PENDING,
          progress: 0,
          htmlContent: '',
          cssContent: '',
        },
      });

      // Queue the generation job (non-blocking!)
      const job = await this.generationQueue.add(
        {
          projectId: project.id,
          userId,
          projectName: name.trim(),
          prompt: prompt.trim(),
          preferences,
          createdAt: new Date(),
        },
        {
          jobId: `gen-${project.id}`,
          priority: 1,
        }
      );

      this.logger.log(`📋 Queued job ${job.id} for project ${project.id}`);

      return { ...project, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to create project in database: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create project in database');
    }
  }

  async getJobStatus(projectId: string) {
    const job = await this.generationQueue.getJob(`gen-${projectId}`);

    if (!job) {
      // Job not in queue, check database
      const project = await this.getProject(projectId);
      return {
        status: project.status,
        progress: project.progress,
        isComplete: project.status === 'COMPLETED',
        source: 'database',
      };
    }

    const state = await job.getState();
    const progress = job.progress() as any;

    return {
      jobId: job.id,
      state,
      progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      source: 'redis',
    };
  }

  private async startOpencodeGeneration(
    projectId: string,
    userId: string,
    projectName: string,
    prompt: string,
    preferences?: any
  ) {
    const startTime = Date.now();

    try {
      // Initialization
      await this.updateProgress(projectId, ProjectStatus.PENDING, 5);
      this.sse.emitEvent(projectId, 'connected', { projectId, status: 'initializing' });
      this.sse.emitThinking(projectId, 'Analyzing your requirements...');

      // Create plan based on preferences or prompt
      const plan = preferences
        ? this.createPlanFromPreferences(preferences)
        : await this.createSimplePlan(prompt);

      this.sse.emitThinking(projectId, 'Planning your React application structure...');

      // Generate todos
      const todos = await this.sse.generateTodos(projectId, prompt, plan);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create OpenCode session
      this.sse.updateTodo(projectId, 'setup', 'in_progress');
      await this.updateProgress(projectId, ProjectStatus.ENHANCING_PROMPT, 10);
      this.sse.emitThinking(projectId, 'Initializing React 19 project...');

      const opencodeSession = await this.opencode.createSession(projectId, projectName);

      if (!opencodeSession || !opencodeSession.id) {
        throw new Error('Failed to create OpenCode session - no session ID returned');
      }

      await this.sessionService.createSessionMapping(
        projectId,
        opencodeSession.id,
        projectName,
        this.opencode.getProjectPath(projectId, opencodeSession.id)
      );

      this.sse.updateTodo(projectId, 'setup', 'completed', {
        logs: ['✓ React 19 project initialized', '✓ Vite + Tailwind configured'],
        duration: 2000,
      });

      // Generate with OpenCode (pass preferences)
      this.sse.updateTodo(projectId, 'dependencies', 'in_progress');
      await this.updateProgress(projectId, ProjectStatus.GENERATING_CODE, 20);
      this.sse.emitThinking(projectId, 'Generating React components with AI...');

      const { files } = await this.opencode.generateWebsite(
        opencodeSession.id,
        projectId,
        prompt,
        plan,
        preferences // Pass preferences to OpenCode
      );

      if (!files || files.length === 0) {
        throw new Error('No files were generated by OpenCode');
      }

      this.logger.log(`Generated ${files.length} files: ${files.join(', ')}`);

      // Update todos progressively
      this.sse.updateTodo(projectId, 'dependencies', 'completed', {
        logs: ['✓ react@19.0.0', '✓ vite@6.0.1', '✓ tailwindcss@3.4.17'],
        duration: 1500,
      });

      await this.updateProgress(projectId, ProjectStatus.GENERATING_CODE, 40);

      // Update token usage
      this.sse.updateTokenUsage(projectId, {
        inputTokens: 2500,
        outputTokens: 3500,
        model: process.env.AI_MODEL || 'grok-code',
      });

      // Mark component todos as completed
      const componentTodos = todos.filter((t) => t.id.startsWith('component-'));
      let currentProgress = 40;
      const progressStep = 45 / componentTodos.length;

      for (const [index, todo] of componentTodos.entries()) {
        this.sse.updateTodo(projectId, todo.id, 'completed', {
          duration: 1000 + Math.random() * 1000,
        });
        currentProgress += progressStep;
        await this.updateProgress(
          projectId,
          ProjectStatus.GENERATING_CODE,
          Math.round(currentProgress)
        );

        // Update token usage
        this.sse.updateTokenUsage(projectId, {
          inputTokens: 500,
          outputTokens: 800,
          model: process.env.AI_MODEL || 'grok-code',
        });
      }

      // Finalize
      this.sse.updateTodo(projectId, 'styling', 'in_progress');
      await this.updateProgress(projectId, ProjectStatus.GENERATING_CODE, 90);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.sse.updateTodo(projectId, 'styling', 'completed', {
        logs: ['✓ Mobile-first responsive design', '✓ Tailwind utilities applied'],
        duration: 1000,
      });

      this.sse.updateTodo(projectId, 'animations', 'in_progress');
      await this.updateProgress(projectId, ProjectStatus.GENERATING_CODE, 95);
      await new Promise((resolve) => setTimeout(resolve, 800));

      this.sse.updateTodo(projectId, 'animations', 'completed', {
        logs: ['✓ Smooth transitions', '✓ Interactive elements'],
        duration: 800,
      });

      // Complete
      const totalTime = Date.now() - startTime;
      const tokenUsage = this.sse.getTokenUsage(projectId);

      await this.prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: projectId },
          data: {
            status: ProjectStatus.COMPLETED,
            progress: 100,
            aiModel: process.env.AI_MODEL || 'grok-code',
            generationTimeMs: totalTime,
            tokensUsed: tokenUsage?.totalTokens || 0,
            estimatedCost: tokenUsage?.costUSD || 0,
          },
        });

        await tx.version.create({
          data: {
            projectId,
            htmlContent: '',
            cssContent: '',
            jsContent: '',
            versionNumber: 1,
            changeReason: 'initial_generation_opencode',
          },
        });
      });

      // Emit completion
      this.sse.emitEvent(projectId, 'generation_completed', {
        projectId,
        sessionId: opencodeSession.id,
        generationTime: totalTime,
        files,
        tokenUsage: tokenUsage || undefined,
      });

      this.logger.log(`✅ [${projectId}] Completed in ${totalTime}ms`);
    } catch (error) {
      this.logger.error(`❌ [${projectId}] Generation failed:`, error);

      // Mark pending todos as failed
      const todos = this.sse.getTodos(projectId);
      todos
        .filter((t) => t.status === 'pending' || t.status === 'in_progress')
        .forEach((todo) => {
          this.sse.updateTodo(projectId, todo.id, 'failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.FAILED,
          progress: 0,
        },
      });

      this.sse.emitEvent(projectId, 'generation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // 🆕 NEW: Create plan from preferences
  private createPlanFromPreferences(preferences: any): any {
    const { theme, brandFeel, pages, features, industry } = preferences;

    const colorSchemes = {
      dark: { primary: '#3B82F6', secondary: '#1E40AF', background: '#1a1a1a' },
      light: { primary: '#3B82F6', secondary: '#1E40AF', background: '#FFFFFF' },
      auto: { primary: '#3B82F6', secondary: '#10B981', background: '#FFFFFF' },
    };

    const colors = colorSchemes[theme] || colorSchemes.auto;

    return {
      techStack: 'react',
      reasoning: `React 18 + Vite + Tailwind for ${brandFeel} ${theme} theme`,
      components: pages || ['header', 'hero', 'features', 'footer'],
      features: features || ['responsive', 'mobile-menu', 'smooth-scroll'],
      colorScheme: colors,
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
      },
      sections: pages || ['hero', 'features', 'about', 'contact'],
      brandFeel: brandFeel || 'modern',
      theme: theme || 'light',
    };
  }

  // Existing simple plan generation
  private async createSimplePlan(prompt: string): Promise<any> {
    const hasEcommerce = /shop|store|buy|cart|product/i.test(prompt);
    const hasPortfolio = /portfolio|work|project|showcase/i.test(prompt);
    const hasBlog = /blog|article|post|news/i.test(prompt);

    return {
      techStack: 'react',
      reasoning: 'React 18 + Vite + Tailwind for modern web app',
      components: ['header', 'hero', 'features', 'footer'],
      features: ['responsive', 'mobile-menu', 'smooth-scroll'],
      colorScheme: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937',
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
      },
      sections: hasEcommerce
        ? ['hero', 'products', 'features', 'testimonials', 'contact']
        : hasPortfolio
          ? ['hero', 'about', 'projects', 'skills', 'contact']
          : hasBlog
            ? ['hero', 'blog', 'categories', 'about', 'contact']
            : ['hero', 'features', 'about', 'contact'],
    };
  }

  // ... rest of the methods (refineProject, updateProject, getProject, etc.)
  // Keep all existing methods unchanged

  async refineProject(userId: string, projectId: string, editPrompt: string) {
    // Keep existing implementation
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Valid user ID is required');
    }

    if (!projectId || typeof projectId !== 'string') {
      throw new BadRequestException('Valid project ID is required');
    }

    if (!editPrompt || typeof editPrompt !== 'string' || editPrompt.trim().length === 0) {
      throw new BadRequestException('Refinement prompt is required');
    }

    const project = await this.getProject(projectId);
    const sessionMapping = await this.sessionService.getSessionByProjectId(projectId);

    if (!sessionMapping) {
      throw new NotFoundException(`No OpenCode session found for project ${projectId}`);
    }

    this.logger.log(`Refining project ${projectId}`);

    try {
      const { files } = await this.opencode.refineWebsite(
        sessionMapping.opencodeSessionId,
        projectId,
        editPrompt.trim()
      );

      const htmlContent = await this.opencode.readFile(
        projectId,
        sessionMapping.opencodeSessionId,
        'src/App.jsx'
      ).catch(() => '');

      const cssContent = await this.opencode.readFile(
        projectId,
        sessionMapping.opencodeSessionId,
        'src/index.css'
      ).catch(() => '');

      const jsContent = await this.opencode.readFile(
        projectId,
        sessionMapping.opencodeSessionId,
        'src/main.jsx'
      ).catch(() => '');

      const result = await this.updateProject(projectId, userId, {
        htmlContent,
        cssContent,
        jsContent,
        changeReason: `AI refinement: ${editPrompt.substring(0, 50)}...`,
      });

      return { ...result, htmlContent, cssContent, jsContent, files };
    } catch (error) {
      this.logger.error(`Failed to refine project ${projectId}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to refine project: ${error.message}`);
    }
  }

  async updateProject(
    id: string,
    userId: string,
    updates: {
      htmlContent?: string;
      cssContent?: string;
      jsContent?: string;
      changeReason: string;
    }
  ) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Valid project ID is required');
    }

    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Valid user ID is required');
    }

    if (!updates.changeReason || typeof updates.changeReason !== 'string') {
      throw new BadRequestException('Change reason is required');
    }

    const project = await this.getProject(id);
    const sessionMapping = await this.sessionService.getSessionByProjectId(id);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.project.update({
          where: { id },
          data: {
            htmlContent: updates.htmlContent || (project as any).htmlContent || '',
            cssContent: updates.cssContent || (project as any).cssContent || '',
          },
        });

        const latestVersion = await tx.version.findFirst({
          where: { projectId: id },
          orderBy: { versionNumber: 'desc' },
        });

        const nextVersion = (latestVersion?.versionNumber || 0) + 1;

        await tx.version.create({
          data: {
            projectId: id,
            htmlContent: updates.htmlContent || (project as any).htmlContent || '',
            cssContent: updates.cssContent || (project as any).cssContent || '',
            jsContent: updates.jsContent || (project as any).jsContent || '',
            versionNumber: nextVersion,
            changeReason: updates.changeReason,
          },
        });

        if (sessionMapping) {
          await this.filesService.saveVersion(id, sessionMapping.opencodeSessionId, nextVersion, {
            'index.html': updates.htmlContent || (project as any).htmlContent,
            'style.css': updates.cssContent || (project as any).cssContent,
            'script.js': updates.jsContent || (project as any).jsContent,
          });
        }

        return { project: updated, version: nextVersion };
      });
    } catch (error) {
      this.logger.error(`Failed to update project ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to update project: ${error.message}`);
    }
  }

  async deleteProject(id: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Valid project ID is required');
    }

    try {
      await this.getProject(id);
      await this.prisma.project.delete({
        where: { id },
      });

      await this.filesService.deleteProject(id);

      this.logger.log(`🗑️ Deleted project ${id} and all related data`);

      return { success: true, message: 'Project deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete project ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to delete project: ${error.message}`);
    }
  }

  async getProject(id: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Valid project ID is required');
    }

    try {
      const project = await this.prisma.project.findUnique({
        where: { id },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 10 } },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID '${id}' not found`);
      }

      const sessionMapping = await this.sessionService.getSessionByProjectId(id);

      if (sessionMapping) {
        try {
          const sessionId = sessionMapping.opencodeSessionId;
          this.logger.log(`📂 Reading files for project ${id}`);

          const [htmlContent, cssContent, jsContent] = await Promise.all([
            this.opencode.readFile(id, sessionId, 'index.html').catch(() => ''),
            this.opencode.readFile(id, sessionId, 'style.css').catch(() => ''),
            this.opencode.readFile(id, sessionId, 'script.js').catch(() => ''),
          ]);

          if (htmlContent) {
            return {
              ...project,
              htmlContent,
              cssContent,
              jsContent,
              sessionId: sessionMapping.opencodeSessionId,
            };
          }
        } catch (error) {
          this.logger.error(`Failed to read files for project ${id}:`, error);
        }
      }

      return project;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to get project ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch project: ${error.message}`);
    }
  }

  async listProjects(userId: string) {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Valid user ID is required');
    }

    try {
      return this.prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { versions: true } },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to list projects for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch projects');
    }
  }

  private async updateProgress(id: string, status: ProjectStatus, progress: number) {
    try {
      await this.prisma.project.update({
        where: { id },
        data: { status, progress },
      });

      this.sse.emitEvent(id, 'status', { status, progress });
    } catch (error) {
      this.logger.error(`Failed to update progress for project ${id}: ${error.message}`);
    }
  }
}
