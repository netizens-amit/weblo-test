// backend/src/modules/sse/sse.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

interface SSEEvent {
    type: string;
    data: any;
}

export interface Todo {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    duration?: number;
    logs?: string[];
    error?: string;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUSD: number;
    model: string;
}

@Injectable()
export class SseService {
    private readonly logger = new Logger(SseService.name);
    private projectEmitters = new Map<string, Subject<SSEEvent>>();

    // Track todos and token usage per project
    private projectTodos = new Map<string, Todo[]>();
    private projectTokens = new Map<string, TokenUsage>();

    /**
     * Get or create emitter for project
     */
    getEmitter(projectId: string): Subject<SSEEvent> {
        if (!this.projectEmitters.has(projectId)) {
            this.projectEmitters.set(projectId, new Subject<SSEEvent>());
            this.logger.log(`Created emitter for project ${projectId}`);
        }
        return this.projectEmitters.get(projectId)!;
    }

    /**
     * Emit event to all subscribers of a project
     */
    emitEvent(projectId: string, type: string, data: any) {
        const emitter = this.getEmitter(projectId);
        this.logger.debug(`[${projectId}] Emitting ${type}:`, JSON.stringify(data, null, 2));
        emitter.next({ type, data });
    }

    /**
     * 🆕 GENERATE TODOS FROM PROMPT
     * This analyzes the prompt and creates a breakdown
     */
    async generateTodos(projectId: string, prompt: string, plan?: any): Promise<Todo[]> {
        const todos: Todo[] = [];

        // Base todos for any React project
        const baseTodos = [
            {
                id: 'setup',
                title: 'Initialize React 19 project with TypeScript',
                status: 'pending' as const,
            },
            {
                id: 'dependencies',
                title: 'Set up shadcn/ui and required dependencies',
                status: 'pending' as const,
            },
        ];

        // Analyze prompt for specific features
        const promptLower = prompt.toLowerCase();

        // Detect project type and components
        const projectType = this.detectProjectType(promptLower);

        // Create component todos from detected project type
        const componentTodos = projectType.components.map((component: string, index: number) => ({
            id: `component-${index}`,
            title: `Create ${component} component`,
            status: 'pending' as const,
        }));

        // Add styling and optimization
        const finalTodos = [
            {
                id: 'styling',
                title: 'Implement responsive design and mobile optimization',
                status: 'pending' as const,
            },
            {
                id: 'animations',
                title: 'Add animations and interactions',
                status: 'pending' as const,
            },
        ];

        todos.push(...baseTodos, ...componentTodos, ...finalTodos);

        // Store todos
        this.projectTodos.set(projectId, todos);

        // Emit todos to frontend
        this.emitEvent(projectId, 'todos_generated', {
            todos,
            total: todos.length,
        });

        this.logger.log(`✅ Generated ${todos.length} todos for project ${projectId}`);
        return todos;
    }

    /**
     * Detect project type and components from prompt
     */
    private detectProjectType(prompt: string): { type: string; components: string[] } {
        const lowerPrompt = prompt.toLowerCase();

        // Dashboard / Admin / LMS / CRM / Analytics
        if (/dashboard|admin|panel|analytics|crm|lms|erp|inventory|management\s*system/.test(lowerPrompt)) {
            return {
                type: 'Dashboard',
                components: ['Sidebar', 'TopBar', 'StatsCard', 'DataTable', 'Chart', 'RecentActivity']
            };
        }

        // E-commerce / Store / Shop
        if (/shop|store|ecommerce|e-commerce|product|cart|checkout/.test(lowerPrompt)) {
            return {
                type: 'E-commerce',
                components: ['Header', 'Hero', 'ProductGrid', 'ProductCard', 'Cart', 'Footer']
            };
        }

        // Portfolio / Personal
        if (/portfolio|personal|photographer|artist|designer/.test(lowerPrompt)) {
            return {
                type: 'Portfolio',
                components: ['Header', 'Hero', 'Gallery', 'About', 'Contact', 'Footer']
            };
        }

        // Blog / Content
        if (/blog|article|content|news|magazine/.test(lowerPrompt)) {
            return {
                type: 'Blog',
                components: ['Header', 'Hero', 'ArticleList', 'ArticleCard', 'Sidebar', 'Footer']
            };
        }

        // Landing / SaaS / Startup
        if (/landing|saas|startup|launch|waitlist/.test(lowerPrompt)) {
            return {
                type: 'Landing Page',
                components: ['Header', 'Hero', 'Features', 'Pricing', 'Testimonials', 'CTA', 'Footer']
            };
        }

        // Default: Website
        return {
            type: 'Website',
            components: ['Header', 'Hero', 'Features', 'About', 'Contact', 'Footer']
        };
    }

    /**
     * 🆕 UPDATE TODO STATUS
     */
    updateTodo(
        projectId: string,
        todoId: string,
        status: 'pending' | 'in_progress' | 'completed' | 'failed',
        data?: {
            logs?: string[];
            error?: string;
            duration?: number;
        }
    ) {
        const todos = this.projectTodos.get(projectId) || [];
        const todo = todos.find(t => t.id === todoId);

        if (!todo) {
            this.logger.warn(`Todo ${todoId} not found for project ${projectId}`);
            return;
        }

        // Update status
        const previousStatus = todo.status;
        todo.status = status;

        // Track timing
        if (status === 'in_progress' && !todo.startTime) {
            todo.startTime = Date.now();
        }
        if ((status === 'completed' || status === 'failed') && todo.startTime && !todo.endTime) {
            todo.endTime = Date.now();
            todo.duration = todo.endTime - todo.startTime;
        }

        // Add logs/error
        if (data?.logs) {
            todo.logs = [...(todo.logs || []), ...data.logs];
        }
        if (data?.error) {
            todo.error = data.error;
        }
        if (data?.duration) {
            todo.duration = data.duration;
        }

        // Emit update
        this.emitEvent(projectId, 'todo_updated', {
            todoId,
            status,
            previousStatus,
            todo,
            timestamp: new Date().toISOString(),
        });

        this.logger.log(`📝 Todo ${todoId}: ${previousStatus} → ${status}`);
    }

    /**
     * 🆕 UPDATE TOKEN USAGE
     */
    updateTokenUsage(
        projectId: string,
        usage: {
            inputTokens: number;
            outputTokens: number;
            model: string;
        }
    ) {
        const existing = this.projectTokens.get(projectId) || {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUSD: 0,
            model: usage.model,
        };

        // Add to existing
        existing.inputTokens += usage.inputTokens;
        existing.outputTokens += usage.outputTokens;
        existing.totalTokens = existing.inputTokens + existing.outputTokens;

        // Calculate cost (example rates for gemini-2.0-flash)
        const costPerInputToken = 0.000001; // $1 per 1M tokens
        const costPerOutputToken = 0.000002; // $2 per 1M tokens

        existing.costUSD =
            (existing.inputTokens * costPerInputToken) +
            (existing.outputTokens * costPerOutputToken);

        this.projectTokens.set(projectId, existing);

        // Emit update
        this.emitEvent(projectId, 'token_usage', {
            inputTokens: existing.inputTokens,
            outputTokens: existing.outputTokens,
            totalTokens: existing.totalTokens,
            costUSD: existing.costUSD.toFixed(4),
            model: existing.model,
            percentage: this.calculateUsagePercentage(existing.totalTokens),
        });

        this.logger.log(
            `💰 Tokens: ${existing.totalTokens.toLocaleString()} | Cost: $${existing.costUSD.toFixed(4)}`
        );
    }

    /**
     * Calculate usage percentage (based on typical context window)
     */
    private calculateUsagePercentage(totalTokens: number): number {
        const maxTokens = 1000000; // 1M token context window for Gemini
        return Math.min((totalTokens / maxTokens) * 100, 100);
    }

    /**
     * 🆕 EMIT AI THINKING EVENT
     */
    emitThinking(projectId: string, message: string) {
        this.emitEvent(projectId, 'ai_thinking', {
            message,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 🆕 EMIT TOOL USAGE EVENT
     */
    emitToolUse(projectId: string, tool: string, args: any) {
        this.emitEvent(projectId, 'ai_tool_use', {
            tool,
            args,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 🆕 EMIT FILE CREATED EVENT
     * Includes file content so frontend can stream files to WebContainer
     */
    emitFileCreated(projectId: string, path: string, content: string, size?: number) {
        this.emitEvent(projectId, 'file_created', {
            path,  // Changed from 'filename' to 'path' for frontend compatibility
            content,  // Include actual file content
            size: size || content.length,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get current todos for project
     */
    getTodos(projectId: string): Todo[] {
        return this.projectTodos.get(projectId) || [];
    }

    /**
     * Get current token usage for project
     */
    getTokenUsage(projectId: string): TokenUsage | null {
        return this.projectTokens.get(projectId) || null;
    }

    /**
     * Remove emitter when no longer needed
     */
    removeEmitter(projectId: string) {
        const emitter = this.projectEmitters.get(projectId);
        if (emitter) {
            emitter.complete();
            this.projectEmitters.delete(projectId);
            this.projectTodos.delete(projectId);
            this.projectTokens.delete(projectId);
            this.logger.log(`Removed emitter for project ${projectId}`);
        }
    }
}