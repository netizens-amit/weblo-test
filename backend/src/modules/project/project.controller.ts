// backend/src/modules/project/project.controller.ts

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Request,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Delete,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { FilesService } from '../files/files.service';
import { SessionService } from '../session/session.service';
import { ConversationService } from '../../conversation/conversation.service';

@Controller('api/projects')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly filesService: FilesService,
    private readonly sessionService: SessionService,
    private readonly conversationService: ConversationService,
  ) { }

  // 🆕 UPDATED: Accept preferences
  @Post()
  async createProject(
    @Request() req,
    @Body() body: {
      name: string;
      prompt: string;
      preferences?: any; 
    },
  ) {
    try {
      // Validate input
      if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new BadRequestException('Project name is required and must be a non-empty string');
      }

      if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
        throw new BadRequestException('Project prompt is required and must be a non-empty string');
      } 

      if (body.name.trim().length > 100) {
        throw new BadRequestException('Project name must be 100 characters or less');
      }

      if (body.prompt.trim().length < 10) {
        throw new BadRequestException('Project prompt must be at least 10 characters');
      }

      const userId = req.user?.id || 'test-user-1';
      const name = body.name.trim();
      const prompt = body.prompt.trim();
      const preferences = body.preferences || null;

      // Create project with preferences
      const project = await this.projectService.createProject(
        userId,
        name,
        prompt,
        preferences
      );
      console.log("preferences : ", preferences);
      // Save initial prompt to conversation with preferences metadata
      await this.conversationService.addMessage(
        project.id,
        'user',
        prompt,
        {
          type: 'initial_prompt',
          preferences: preferences
        }
      );

      return {
        success: true,
        data: project,
        message: 'Project created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create project: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to create project',
        error: error.message,
      });
    }
  }

  @Get()
  async listProjects(@Request() req) {
    try {
      const userId = req.user?.id || 'test-user-1';
      const projects = await this.projectService.listProjects(userId);

      return {
        success: true,
        data: projects,
        count: projects.length,
      };
    } catch (error) {
      this.logger.error(`Failed to list projects: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch projects',
        error: error.message,
      });
    }
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      const project = await this.projectService.getProject(id);

      return {
        success: true,
        data: project,
      };
    } catch (error) {
      this.logger.error(`Failed to get project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch project',
        error: error.message,
      });
    }
  }

  @Patch(':id')
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body() body: {
      htmlContent?: string;
      cssContent?: string;
      changeReason?: string;
    },
  ) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      const userId = req.user?.id || 'test-user-1';

      const result = await this.projectService.updateProject(id, userId, {
        ...body,
        changeReason: body.changeReason || 'manual_edit',
      });

      return {
        success: true,
        data: result,
        message: 'Project updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to update project',
        error: error.message,
      });
    }
  }

  @Post(':id/refine')
  async refineProject(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { prompt: string },
  ) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
        throw new BadRequestException('Refinement prompt is required and must be a non-empty string');
      }

      const userId = req.user?.id || 'test-user-1';
      const prompt = body.prompt.trim();

      // Save user's refinement request
      await this.conversationService.addMessage(
        id,
        'user',
        prompt,
        { type: 'refinement_request' }
      );

      const result = await this.projectService.refineProject(userId, id, prompt);

      // Save AI's response
      await this.conversationService.addMessage(
        id,
        'assistant',
        'I\'ve updated your React components based on your request.',
        {
          type: 'refinement_response',
          filesModified: result.files || [],
        }
      );

      return {
        success: true,
        data: result,
        message: 'Project refined successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to refine project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to refine project',
        error: error.message,
      });
    }
  }

  @Get(':id/files')
  async getProjectFiles(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      const sessionMapping = await this.sessionService.getSessionByProjectId(id);

      if (!sessionMapping) {
        return {
          success: true,
          data: { files: [] },
          message: 'No session found for this project',
        };
      }

      const files = await this.filesService.readProjectFiles(
        id,
        sessionMapping.opencodeSessionId
      );

      return {
        success: true,
        data: { files },
        count: files.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get files for project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch project files',
        error: error.message,
      });
    }
  }

  @Get(':id/conversation')
  async getConversation(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      const messages = await this.conversationService.getConversation(id);

      return {
        success: true,
        data: { messages },
        count: messages.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation for project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch conversation',
        error: error.message,
      });
    }
  }

  @Post(':id/conversation/clear')
  async clearConversation(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      await this.conversationService.clearConversation(id);

      return {
        success: true,
        message: 'Conversation cleared successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to clear conversation for project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to clear conversation',
        error: error.message,
      });
    }
  }

  @Delete(':id')
  async deleteProject(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      await this.projectService.deleteProject(id);

      return {
        success: true,
        message: 'Project deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete project ${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to delete project',
        error: error.message,
      });
    }
  }

  @Get(':id/job-status')
  async getJobStatus(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Valid project ID is required');
      }

      const status = await this.projectService.getJobStatus(id);

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw error;
    }
  }
}
