# BullMQ in NestJS - Complete Implementation Guide

A detailed, step-by-step guide for Laravel developers transitioning to NestJS queue system.

---

## 📋 Table of Contents

1. [Laravel vs NestJS Queue Comparison](#laravel-vs-nestjs-queue-comparison)
2. [Understanding BullMQ Architecture](#understanding-bullmq-architecture)
3. [Installation & Setup](#installation--setup)
4. [File Structure](#file-structure)
5. [Step-by-Step Code Explanation](#step-by-step-code-explanation)
6. [Complete Flow Diagram](#complete-flow-diagram)
7. [Common Patterns & Best Practices](#common-patterns--best-practices)

---

## 🔄 Laravel vs NestJS Queue Comparison

If you're coming from Laravel, here's how the concepts map:

| Laravel Concept | NestJS/Bull Equivalent | Description |
|-----------------|------------------------|-------------|
| `Queue` facades | `@InjectQueue()` | Access queue to dispatch jobs |
| `php artisan queue:work` | BullMQ Worker (auto) | Processes jobs (runs automatically in NestJS) |
| `Job` class | `Processor` class | Handles job execution logic |
| `dispatch(new MyJob())` | `queue.add(data)` | Add job to queue |
| `handle()` method | `@Process()` decorator | Method that runs when job executes |
| `config/queue.php` | `BullModule.forRoot()` | Queue configuration |
| `failed_jobs` table | Redis + Event Listeners | Failed job tracking |
| `Job::dispatch()->delay()` | `queue.add(data, { delay })` | Delayed jobs |
| `ShouldQueue` interface | `@Processor()` decorator | Marks class as queue processor |
| `$tries` property | `attempts` option | Number of retry attempts |
| `$backoff` property | `backoff` option | Delay between retries |
| `Job Events` | `@OnQueue*` decorators | Lifecycle event hooks |

### Quick Comparison Example

**Laravel (Dispatching a Job):**
```php
// In Laravel Controller
use App\Jobs\GenerateWebsite;

class ProjectController extends Controller
{
    public function create(Request $request)
    {
        $project = Project::create([...]);
        
        // Dispatch job to queue
        GenerateWebsite::dispatch($project)
            ->onQueue('generation')
            ->delay(now()->addSeconds(5));
            
        return response()->json($project);
    }
}
```

**NestJS (Dispatching a Job):**
```typescript
// In NestJS Service
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ProjectService {
    constructor(
        @InjectQueue('generation') private generationQueue: Queue
    ) {}
    
    async createProject(data: CreateProjectDto) {
        const project = await this.prisma.project.create({...});
        
        // Add job to queue
        await this.generationQueue.add(
            { projectId: project.id, ...data },
            { delay: 5000 }
        );
        
        return project;
    }
}
```

---

## 🏗️ Understanding BullMQ Architecture

### How It Works (Simple Explanation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR NESTJS APPLICATION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐         ┌─────────────────┐                   │
│  │   Controller    │         │    Processor    │                   │
│  │   (API Layer)   │         │  (Job Worker)   │                   │
│  └────────┬────────┘         └────────▲────────┘                   │
│           │                           │                             │
│           ▼                           │                             │
│  ┌─────────────────┐                  │                             │
│  │    Service      │                  │                             │
│  │ (Business Logic)│                  │                             │
│  └────────┬────────┘                  │                             │
│           │                           │                             │
│           │ queue.add(job)            │ @Process()                  │
│           ▼                           │                             │
│  ┌────────────────────────────────────┴────────────────────────┐   │
│  │                         BULL QUEUE                           │   │
│  │                    (Stored in Redis)                         │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │   │
│  │  │ Job1 │ │ Job2 │ │ Job3 │ │ Job4 │ │ Job5 │  ...          │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────┐
                         │      REDIS      │
                         │   (Job Store)   │
                         └─────────────────┘
```

### Key Components

1. **Queue**: A named channel where jobs wait to be processed (like Laravel's `QUEUE_CONNECTION`)
2. **Job**: A unit of work with data to process (like Laravel's Job class)
3. **Processor**: A class that processes jobs (like Laravel's `handle()` method)
4. **Redis**: Storage for jobs (like Laravel's `database` or `redis` driver)

---

## 📦 Installation & Setup

### Step 1: Install Required Packages

```bash
cd backend

# Install Bull and NestJS Bull integration
npm install @nestjs/bull bull

# Install Redis client (Bull uses ioredis internally)
npm install ioredis

# Type definitions for TypeScript
npm install -D @types/bull
```

**Laravel Equivalent**: This is like adding `predis/predis` to composer.json and configuring `QUEUE_CONNECTION=redis` in `.env`

### Step 2: Environment Variables

Add to your `.env` file:

```env
# Redis Configuration (for Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=         # Leave empty if no password
```

**Laravel Equivalent**: Same as Laravel's `.env` Redis configuration!

### Step 3: Start Redis Server

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# macOS (with Homebrew)
brew install redis
brew services start redis

# Docker (optional)
docker run -d -p 6379:6379 redis:alpine

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

---

## 📁 File Structure

```
backend/src/queue/
├── queue.module.ts           # Module configuration (like config/queue.php)
├── generation.queue.ts       # Job data types & queue name constant
└── generation.processor.ts   # Job handler (like app/Jobs/GenerateWebsite.php)
```

**Laravel Equivalent Structure:**
```
laravel-app/
├── config/queue.php              → queue.module.ts
├── app/Jobs/GenerateWebsite.php  → generation.processor.ts
└── (No equivalent)               → generation.queue.ts (TypeScript types)
```

---

## 📝 Step-by-Step Code Explanation

### File 1: `generation.queue.ts` - Job Definitions

This file defines the **queue name** and **TypeScript interfaces** for type safety.

```typescript
// ────────────────────────────────────────────────────────────────────
// FILE: backend/src/queue/generation.queue.ts
// PURPOSE: Define queue constants and job data types
// LARAVEL EQUIVALENT: No direct equivalent - Laravel uses array validation
// ────────────────────────────────────────────────────────────────────

// Queue name constant - like defining QUEUE_NAME in Laravel
// This is used to identify the queue in Redis
export const GENERATION_QUEUE = 'generation';

// ┌─────────────────────────────────────────────────────────────────┐
// │ GenerationJobData - Data passed TO the job when dispatching    │
// │                                                                 │
// │ Laravel Equivalent:                                             │
// │ class GenerateWebsite implements ShouldQueue {                  │
// │     public function __construct(                                │
// │         public string $projectId,                               │
// │         public ?string $userId,                                 │
// │         public string $projectName,                             │
// │         public string $prompt,                                  │
// │         public array $preferences = [],                         │
// │     ) {}                                                        │
// │ }                                                               │
// └─────────────────────────────────────────────────────────────────┘
export interface GenerationJobData {
  projectId: string;      // Primary identifier for the project
  userId?: string;        // Optional - who initiated the job
  projectName: string;    // Human-readable project name
  prompt: string;         // AI prompt for generation
  preferences?: any;      // Optional settings (theme, colors, etc.)
  createdAt: Date;        // When job was created
}

// ┌─────────────────────────────────────────────────────────────────┐
// │ GenerationJobProgress - Progress updates DURING job execution  │
// │                                                                 │
// │ Laravel Equivalent: Using job events or updating DB progress   │
// │ event(new JobProgressUpdated($job, $progress));                │
// └─────────────────────────────────────────────────────────────────┘
export interface GenerationJobProgress {
  status: 'pending' | 'creating_session' | 'generating' | 'saving_files' | 'completed' | 'failed';
  progress: number;           // 0-100 percentage
  currentStep?: string;       // Human-readable status message
  filesGenerated?: string[];  // List of generated file paths
  error?: string;             // Error message if failed
  tokenUsage?: {              // AI token tracking
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUSD: number;
  };
}

// ┌─────────────────────────────────────────────────────────────────┐
// │ GenerationJobResult - Final result AFTER job completes         │
// │                                                                 │
// │ Laravel Equivalent: Return value from handle() method          │
// │ public function handle(): array {                               │
// │     return ['success' => true, 'files' => [...]];              │
// │ }                                                               │
// └─────────────────────────────────────────────────────────────────┘
export interface GenerationJobResult {
  success: boolean;
  files?: string[];           // List of generated files
  sessionId?: string;         // OpenCode session ID
  error?: string;             // Error message if failed
  generationTimeMs?: number;  // How long generation took
}
```

**Key Takeaway**: In TypeScript/NestJS, we define strict types for job data. This gives us:
- Auto-completion in IDE
- Compile-time error checking
- Self-documenting code

---

### File 2: `queue.module.ts` - Module Configuration

This is the **main configuration file** - equivalent to Laravel's `config/queue.php`.

```typescript
// ────────────────────────────────────────────────────────────────────
// FILE: backend/src/queue/queue.module.ts
// PURPOSE: Configure Bull queue with Redis and register processor
// LARAVEL EQUIVALENT: config/queue.php + adding job to service provider
// ────────────────────────────────────────────────────────────────────

import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GenerationProcessor } from './generation.processor';
import { GENERATION_QUEUE } from './generation.queue';

// Import modules that the processor needs
import { OpencodeModule } from '../modules/opencode/opencode.module';
import { SessionModule } from '../modules/session/session.module';
import { FilesModule } from '../modules/files/files.module';
import { SseModule } from '../modules/sse/sse.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    // ┌───────────────────────────────────────────────────────────────┐
    // │ STEP 1: Configure Bull with Redis connection                  │
    // │                                                               │
    // │ Laravel Equivalent (config/queue.php):                        │
    // │ 'redis' => [                                                  │
    // │     'driver' => 'redis',                                      │
    // │     'connection' => 'default',                                │
    // │     'queue' => 'default',                                     │
    // │     'retry_after' => 90,                                      │
    // │     'block_for' => null,                                      │
    // │ ],                                                            │
    // └───────────────────────────────────────────────────────────────┘
    BullModule.forRootAsync({
      imports: [ConfigModule],
      
      // useFactory is like Laravel's config() helper - it reads from .env
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', ''),
        },
        
        // ┌─────────────────────────────────────────────────────────┐
        // │ Default options for ALL jobs in ALL queues             │
        // │                                                         │
        // │ Laravel Equivalent (in Job class):                      │
        // │ public $tries = 3;                                      │
        // │ public $backoff = [5, 30, 60];                         │
        // │ public $deleteWhenMissingModels = true;                │
        // └─────────────────────────────────────────────────────────┘
        defaultJobOptions: {
          removeOnComplete: 100,   // Keep last 100 completed jobs in Redis
                                   // Laravel: No direct equivalent (uses DB)
          
          removeOnFail: 50,        // Keep last 50 failed jobs
                                   // Laravel: failed_jobs table keeps all
          
          attempts: 3,             // Retry 3 times on failure
                                   // Laravel: public $tries = 3;
          
          backoff: {
            type: 'exponential',   // Exponential backoff (5s, 10s, 20s...)
            delay: 5000,           // Start with 5 second delay
                                   // Laravel: public $backoff = [5, 10, 20];
          },
        },
      }),
      inject: [ConfigService],
    }),
    
    // ┌───────────────────────────────────────────────────────────────┐
    // │ STEP 2: Register specific queues                              │
    // │                                                               │
    // │ Laravel Equivalent: Just use queue name in dispatch()         │
    // │ GenerateWebsite::dispatch($data)->onQueue('generation');     │
    // │                                                               │
    // │ In NestJS, we explicitly register each queue                  │
    // └───────────────────────────────────────────────────────────────┘
    BullModule.registerQueue({
      name: GENERATION_QUEUE,  // 'generation'
      // You can add queue-specific options here too
    }),
    
    // ┌───────────────────────────────────────────────────────────────┐
    // │ STEP 3: Import modules that the processor depends on          │
    // │                                                               │
    // │ forwardRef() handles circular dependencies                    │
    // │ Laravel Equivalent: No direct equivalent - Laravel auto-wires │
    // └───────────────────────────────────────────────────────────────┘
    forwardRef(() => OpencodeModule),   // For AI code generation
    forwardRef(() => SessionModule),    // For session management
    forwardRef(() => FilesModule),      // For file operations
    forwardRef(() => SseModule),        // For real-time updates
    PrismaModule,                        // For database access
  ],
  
  // ┌───────────────────────────────────────────────────────────────┐
  // │ STEP 4: Register the processor                                 │
  // │                                                                │
  // │ Laravel Equivalent: Jobs are auto-discovered in app/Jobs/      │
  // │ In NestJS, we explicitly register in providers array          │
  // └───────────────────────────────────────────────────────────────┘
  providers: [GenerationProcessor],
  
  // Export BullModule so other modules can inject queues
  exports: [BullModule],
})
export class QueueModule {}
```

**Key Differences from Laravel:**
1. **Explicit Registration**: NestJS requires explicit queue registration, Laravel auto-discovers jobs
2. **Dependency Injection**: NestJS uses DI for services, Laravel uses facades
3. **Module System**: NestJS modules encapsulate functionality, Laravel uses global access

---

### File 3: `generation.processor.ts` - The Job Handler

This is the **main worker** - equivalent to Laravel's Job class with `handle()` method.

```typescript
// ────────────────────────────────────────────────────────────────────
// FILE: backend/src/queue/generation.processor.ts
// PURPOSE: Process generation jobs from the queue
// LARAVEL EQUIVALENT: app/Jobs/GenerateWebsite.php
// ────────────────────────────────────────────────────────────────────

import {
    Processor,        // Decorator to mark class as job processor
    Process,          // Decorator for the handle method
    OnQueueActive,    // Event: job started
    OnQueueCompleted, // Event: job finished successfully
    OnQueueFailed,    // Event: job failed
    OnQueueStalled    // Event: job stalled (worker died mid-processing)
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
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';

// ┌───────────────────────────────────────────────────────────────────┐
// │ @Processor(GENERATION_QUEUE)                                      │
// │                                                                   │
// │ This tells NestJS: "This class handles jobs from 'generation' Q" │
// │                                                                   │
// │ Laravel Equivalent:                                               │
// │ class GenerateWebsite implements ShouldQueue {                    │
// │     use Dispatchable, InteractsWithQueue, Queueable;             │
// │     public $queue = 'generation';                                │
// │ }                                                                 │
// └───────────────────────────────────────────────────────────────────┘
@Processor(GENERATION_QUEUE)
export class GenerationProcessor {
    // Logger for debugging (like Laravel's Log facade)
    private readonly logger = new Logger(GenerationProcessor.name);

    // ┌───────────────────────────────────────────────────────────────┐
    // │ Constructor - Dependency Injection                            │
    // │                                                               │
    // │ Laravel Equivalent: Dependencies in handle() method           │
    // │ public function handle(                                       │
    // │     OpencodeService $opencode,                               │
    // │     SessionService $session,                                  │
    // │     ...                                                       │
    // │ ) {}                                                          │
    // └───────────────────────────────────────────────────────────────┘
    constructor(
        // forwardRef handles circular dependencies between modules
        @Inject(forwardRef(() => OpencodeService))
        private readonly opencode: OpencodeService,

        @Inject(forwardRef(() => SessionService))
        private readonly sessionService: SessionService,

        @Inject(forwardRef(() => SseService))
        private readonly sse: SseService,

        private readonly prisma: PrismaService,
    ) { }

    // ┌───────────────────────────────────────────────────────────────┐
    // │ @Process() - THE MAIN JOB HANDLER                             │
    // │                                                               │
    // │ This method runs when a job is picked up from the queue       │
    // │                                                               │
    // │ Laravel Equivalent:                                           │
    // │ public function handle(): void {                              │
    // │     // Your job logic here                                    │
    // │ }                                                             │
    // └───────────────────────────────────────────────────────────────┘
    @Process()
    async handleGeneration(job: Job<GenerationJobData>): Promise<GenerationJobResult> {
        // ┌───────────────────────────────────────────────────────────┐
        // │ Extract job data - like $this->property in Laravel       │
        // │                                                           │
        // │ Laravel: $this->projectId, $this->prompt                  │
        // │ NestJS:  job.data.projectId, job.data.prompt              │
        // └───────────────────────────────────────────────────────────┘
        const { projectId, userId, projectName, prompt, preferences } = job.data;
        const startTime = Date.now();

        this.logger.log(`🚀 Processing job ${job.id} for project ${projectId}`);

        try {
            // ════════════════════════════════════════════════════════════
            // STEP 1: Create AI Session
            // ════════════════════════════════════════════════════════════
            await this.updateProgress(job, {
                status: 'creating_session',
                progress: 10,
                currentStep: 'Creating OpenCode session...',
            });

            // Create session with AI service
            const session = await this.opencode.createSession(projectId, projectName);
            
            // Store session mapping in database
            await this.sessionService.createSessionMapping(projectId, session.id, projectName);

            // ════════════════════════════════════════════════════════════
            // STEP 2: Generate ToDo List
            // ════════════════════════════════════════════════════════════
            await this.updateProgress(job, {
                status: 'generating',
                progress: 20,
                currentStep: 'Starting AI generation...',
            });

            // Generate task list based on prompt
            await this.sse.generateTodos(projectId, prompt);

            // ════════════════════════════════════════════════════════════
            // STEP 3: Generate Website Code
            // ════════════════════════════════════════════════════════════
            await this.updateProgress(job, {
                status: 'generating',
                progress: 30,
                currentStep: 'Generating code with AI...',
            });

            // Call AI to generate actual code
            const result = await this.opencode.generateWebsite(
                session.id,
                projectId,
                prompt,
                null,
                preferences,
            );

            // ════════════════════════════════════════════════════════════
            // STEP 4: Save Generated Files
            // ════════════════════════════════════════════════════════════
            await this.updateProgress(job, {
                status: 'saving_files',
                progress: 90,
                currentStep: 'Saving generated files...',
                filesGenerated: result.files,
            });

            // ════════════════════════════════════════════════════════════
            // STEP 5: Mark as Complete
            // ════════════════════════════════════════════════════════════
            const totalTime = Date.now() - startTime;
            const tokenUsage = this.sse.getTokenUsage(projectId);

            // Update project in database
            // Laravel Equivalent: Project::where('id', $projectId)->update([...])
            await this.prisma.project.update({
                where: { id: projectId },
                data: {
                    status: ProjectStatus.COMPLETED,
                    progress: 100,
                    generationTimeMs: totalTime,
                    tokensUsed: tokenUsage?.totalTokens || 0,
                    estimatedCost: tokenUsage?.costUSD || 0,
                },
            });

            // Final progress update
            await this.updateProgress(job, {
                status: 'completed',
                progress: 100,
                currentStep: 'Generation complete!',
                filesGenerated: result.files,
                tokenUsage,
            });

            // ┌───────────────────────────────────────────────────────┐
            // │ Emit SSE event - Real-time notification to frontend  │
            // │                                                       │
            // │ Laravel Equivalent:                                   │
            // │ event(new GenerationCompleted($project));            │
            // │ (with Laravel Echo/Pusher)                           │
            // └───────────────────────────────────────────────────────┘
            this.sse.emitEvent(projectId, 'generation_completed', {
                projectId,
                sessionId: session.id,
                generationTime: totalTime,
                files: result.files,
                tokenUsage,
            });

            this.logger.log(`✅ Job ${job.id} completed in ${totalTime}ms`);

            // ┌───────────────────────────────────────────────────────┐
            // │ Return result - stored in Redis, accessible later    │
            // │                                                       │
            // │ Laravel Equivalent: return value from handle()       │
            // └───────────────────────────────────────────────────────┘
            return {
                success: true,
                files: result.files,
                sessionId: session.id,
                generationTimeMs: totalTime,
            };

        } catch (error) {
            // ┌───────────────────────────────────────────────────────┐
            // │ Error Handling                                        │
            // │                                                       │
            // │ Laravel Equivalent:                                   │
            // │ public function failed(Throwable $exception): void { │
            // │     Log::error($exception->getMessage());            │
            // │     $this->project->update(['status' => 'failed']);  │
            // │ }                                                     │
            // └───────────────────────────────────────────────────────┘
            this.logger.error(`Job ${job.id} failed: ${error.message}`);

            // Update progress to failed state
            await this.updateProgress(job, {
                status: 'failed',
                progress: 0,
                error: error.message,
            });

            // Update database status
            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: ProjectStatus.ERROR },
            });

            // Notify connected clients
            this.sse.emitEvent(projectId, 'generation_error', {
                error: error.message
            });

            // Re-throw to trigger retry mechanism
            // Laravel Equivalent: throw $exception; (triggers $tries)
            throw error;
        }
    }

    // ┌───────────────────────────────────────────────────────────────┐
    // │ Helper: Update Progress                                       │
    // │                                                               │
    // │ Updates progress in 3 places:                                 │
    // │ 1. Bull job (Redis) - for job.progress()                     │
    // │ 2. SSE - for real-time frontend updates                      │
    // │ 3. Database - for persistence and API access                 │
    // └───────────────────────────────────────────────────────────────┘
    private async updateProgress(job: Job, progress: GenerationJobProgress) {
        // Update Bull job progress (stored in Redis)
        // Access with: job.progress() or via getJob()
        await job.progress(progress);

        // Emit via SSE for real-time frontend updates
        const projectId = job.data.projectId;
        this.sse.emitEvent(projectId, 'job_progress', progress);

        // Update database for API access
        await this.prisma.project.update({
            where: { id: projectId },
            data: {
                progress: progress.progress,
                status: this.mapStatus(progress.status),
            },
        });
    }

    // Map internal status to Prisma enum
    private mapStatus(status: string): ProjectStatus {
        const statusMap: Record<string, ProjectStatus> = {
            'pending': ProjectStatus.PENDING,
            'creating_session': ProjectStatus.GENERATING_CODE,
            'generating': ProjectStatus.GENERATING_CODE,
            'saving_files': ProjectStatus.GENERATING_CODE,
            'completed': ProjectStatus.COMPLETED,
            'failed': ProjectStatus.ERROR,
        };
        return statusMap[status] || ProjectStatus.PENDING;
    }

    // ════════════════════════════════════════════════════════════════
    // QUEUE EVENT LISTENERS
    // Laravel Equivalent: Job Events in EventServiceProvider
    // ════════════════════════════════════════════════════════════════

    // ┌───────────────────────────────────────────────────────────────┐
    // │ @OnQueueActive - Job started processing                       │
    // │                                                               │
    // │ Laravel Equivalent:                                           │
    // │ Event::listen(JobProcessing::class, function($event) {       │
    // │     Log::info('Job started: ' . $event->job->uuid());       │
    // │ });                                                           │
    // └───────────────────────────────────────────────────────────────┘
    @OnQueueActive()
    onActive(job: Job) {
        this.logger.log(`Job ${job.id} started for project ${job.data.projectId}`);
    }

    // ┌───────────────────────────────────────────────────────────────┐
    // │ @OnQueueCompleted - Job finished successfully                 │
    // │                                                               │
    // │ Laravel Equivalent:                                           │
    // │ Event::listen(JobProcessed::class, function($event) {        │
    // │     Log::info('Job completed');                              │
    // │ });                                                           │
    // └───────────────────────────────────────────────────────────────┘
    @OnQueueCompleted()
    onCompleted(job: Job, result: GenerationJobResult) {
        this.logger.log(`Job ${job.id} completed: ${result.files?.length || 0} files`);
    }

    // ┌───────────────────────────────────────────────────────────────┐
    // │ @OnQueueFailed - Job failed after all retries                 │
    // │                                                               │
    // │ Laravel Equivalent:                                           │
    // │ Event::listen(JobFailed::class, function($event) {           │
    // │     Log::error('Job failed: ' . $event->exception);          │
    // │ });                                                           │
    // │                                                               │
    // │ OR in Job class:                                              │
    // │ public function failed(Throwable $exception): void           │
    // └───────────────────────────────────────────────────────────────┘
    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`);
    }

    // ┌───────────────────────────────────────────────────────────────┐
    // │ @OnQueueStalled - Job stalled (worker crashed mid-job)       │
    // │                                                               │
    // │ Laravel Equivalent: No direct equivalent                      │
    // │ Laravel handles this via retry_after in config/queue.php     │
    // └───────────────────────────────────────────────────────────────┘
    @OnQueueStalled()
    onStalled(job: Job) {
        this.logger.warn(`Job ${job.id} stalled, may be retried`);
    }
}
```

---

### File 4: Using the Queue in `project.service.ts`

This is where you **dispatch jobs** - equivalent to `dispatch()` in Laravel.

```typescript
// ────────────────────────────────────────────────────────────────────
// FILE: backend/src/modules/project/project.service.ts (relevant parts)
// PURPOSE: Dispatch jobs to the queue
// LARAVEL EQUIVALENT: Controller or Service dispatching jobs
// ────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { GENERATION_QUEUE, GenerationJobData } from '../../queue/generation.queue';

@Injectable()
export class ProjectService {
    constructor(
        // ┌───────────────────────────────────────────────────────────┐
        // │ @InjectQueue - Inject the queue instance                  │
        // │                                                           │
        // │ Laravel Equivalent:                                       │
        // │ No injection needed - use Queue facade or dispatch()     │
        // │ Queue::push(new GenerateWebsite($data));                 │
        // └───────────────────────────────────────────────────────────┘
        @InjectQueue(GENERATION_QUEUE) 
        private generationQueue: Queue<GenerationJobData>,
        
        // ... other dependencies
    ) {}

    async createProject(userId: string, name: string, prompt: string, preferences?: any) {
        // Create project in database first
        const project = await this.prisma.project.create({
            data: {
                userId,
                name: name.trim(),
                originalPrompt: prompt.trim(),
                preferences: preferences ? JSON.stringify(preferences) : null,
                status: ProjectStatus.PENDING,
                progress: 0,
            },
        });

        // ┌───────────────────────────────────────────────────────────┐
        // │ queue.add() - Add job to queue (DISPATCH)                 │
        // │                                                           │
        // │ This is NON-BLOCKING! Returns immediately.                │
        // │ Job runs in background via the Processor.                 │
        // │                                                           │
        // │ Laravel Equivalent:                                       │
        // │ GenerateWebsite::dispatch([                               │
        // │     'projectId' => $project->id,                          │
        // │     'userId' => $userId,                                  │
        // │     'projectName' => $name,                               │
        // │     'prompt' => $prompt,                                  │
        // │     'preferences' => $preferences,                        │
        // │ ])->onQueue('generation');                               │
        // └───────────────────────────────────────────────────────────┘
        const job = await this.generationQueue.add(
            // First argument: Job data
            {
                projectId: project.id,
                userId,
                projectName: name.trim(),
                prompt: prompt.trim(),
                preferences,
                createdAt: new Date(),
            },
            // Second argument: Job options
            {
                jobId: `gen-${project.id}`,  // Custom job ID for easy lookup
                priority: 1,                   // Lower = higher priority
                
                // Other available options:
                // delay: 5000,                // Delay 5 seconds (like ->delay())
                // attempts: 5,                // Override default attempts
                // timeout: 300000,            // 5 minute timeout
                // removeOnComplete: true,     // Remove from Redis when done
                // removeOnFail: false,        // Keep failed jobs for inspection
            }
        );

        this.logger.log(`📋 Queued job ${job.id} for project ${project.id}`);

        // Return immediately - job processes in background
        return { ...project, jobId: job.id };
    }

    // ┌───────────────────────────────────────────────────────────────┐
    // │ getJobStatus - Check job status                               │
    // │                                                               │
    // │ Laravel Equivalent:                                           │
    // │ No built-in equivalent - would need to track in database     │
    // │ Laravel Horizon provides dashboard for monitoring            │
    // └───────────────────────────────────────────────────────────────┘
    async getJobStatus(projectId: string) {
        // Get job from Redis by custom ID
        const job = await this.generationQueue.getJob(`gen-${projectId}`);

        if (!job) {
            // Job not in queue - check database
            const project = await this.getProject(projectId);
            return {
                status: project.status,
                progress: project.progress,
                isComplete: project.status === 'COMPLETED',
                source: 'database',
            };
        }

        // Get current job state
        const state = await job.getState();
        const progress = job.progress() as any;

        return {
            jobId: job.id,
            state,                          // 'waiting', 'active', 'completed', 'failed', 'delayed'
            progress,                        // Our custom progress object
            attemptsMade: job.attemptsMade,  // How many retries so far
            failedReason: job.failedReason,  // Error message if failed
            finishedOn: job.finishedOn,      // Timestamp when completed
            processedOn: job.processedOn,    // Timestamp when started
            source: 'redis',
        };
    }
}
```

---

## 🔄 Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE QUEUE FLOW                              │
└──────────────────────────────────────────────────────────────────────────────┘

      STEP 1: API Request                    STEP 2: Add to Queue
    ┌─────────────────┐                    ┌─────────────────────┐
    │  POST /projects │                    │  generationQueue    │
    │                 │ ──────────────────▶│  .add(jobData)      │
    │  { name, prompt}│                    │                     │
    └─────────────────┘                    └──────────┬──────────┘
           │                                          │
           │ Returns immediately                      │
           │ { projectId, jobId }                     ▼
           │                               ┌─────────────────────┐
           │                               │       REDIS         │
           │                               │ ┌─────────────────┐ │
           │                               │ │   Job Queue     │ │
           │                               │ │ ┌───┐ ┌───┐     │ │
           │                               │ │ │J1 │ │J2 │ ... │ │
           │                               │ │ └───┘ └───┘     │ │
           │                               │ └─────────────────┘ │
           │                               └──────────┬──────────┘
           │                                          │
           │                                          │ STEP 3: Worker picks job
           │                                          ▼
           │                               ┌─────────────────────┐
           │                               │ GenerationProcessor │
           │                               │                     │
           │                               │ @Process()          │
           │                               │ handleGeneration()  │
           │                               │                     │
           │                               │ 1. Create session   │
           │                               │ 2. Generate todos   │
           │                               │ 3. Generate code    │
           │                               │ 4. Save files       │
           │                               │ 5. Update DB        │
           │                               └──────────┬──────────┘
           │                                          │
           │                                          │ STEP 4: Progress updates
           │                                          ▼
           │                               ┌─────────────────────┐
           │                               │     SSE Service     │──────────────┐
           │                               │                     │              │
           │                               │ emitEvent()         │              │
           │                               └─────────────────────┘              │
           │                                                                    │
           │                                          STEP 5: Real-time        │
           │                                          updates to frontend      │
           │                                                                    │
           │                               ┌─────────────────────┐              │
           │                               │      Frontend       │◀─────────────┘
           │                               │                     │
           │                               │ EventSource         │
           │                               │ Progress: 50%       │
           │                               │ Status: generating  │
           │                               └─────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TIMELINE:

    0ms         100ms       5000ms      30000ms     60000ms
    │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼
┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
│Request│   │Queued │   │Started│   │50%    │   │Done!  │
│ sent  │──▶│ job   │──▶│process│──▶│complete──▶│ 100%  │
└───────┘   └───────┘   └───────┘   └───────┘   └───────┘
    │           │
    └───────────┘
    Response returned
    immediately!
```

---

## 📚 Common Patterns & Best Practices

### Pattern 1: Delayed Jobs

```typescript
// NestJS - Delay job by 5 minutes
await this.generationQueue.add(jobData, {
    delay: 5 * 60 * 1000  // milliseconds
});

// Laravel Equivalent:
// GenerateWebsite::dispatch($data)->delay(now()->addMinutes(5));
```

### Pattern 2: Priority Queues

```typescript
// NestJS - Higher priority (lower number = higher priority)
await this.generationQueue.add(jobData, { priority: 1 });  // VIP
await this.generationQueue.add(jobData, { priority: 10 }); // Normal

// Laravel Equivalent:
// No direct equivalent - use separate queue names and process in order
```

### Pattern 3: Named Processors

```typescript
// Register multiple processors for same queue
@Processor(GENERATION_QUEUE)
export class GenerationProcessor {
    @Process('fast')
    async handleFast(job: Job) { /* ... */ }
    
    @Process('slow')
    async handleSlow(job: Job) { /* ... */ }
}

// Dispatch to specific processor
await this.queue.add('fast', jobData);
await this.queue.add('slow', jobData);

// Laravel Equivalent: Not directly supported
```

### Pattern 4: Bulk Operations

```typescript
// Add multiple jobs at once
await this.generationQueue.addBulk([
    { data: job1Data, opts: { priority: 1 } },
    { data: job2Data, opts: { priority: 2 } },
    { data: job3Data, opts: { priority: 3 } },
]);

// Laravel Equivalent:
// Bus::batch([
//     new Job1($data1),
//     new Job2($data2),
// ])->dispatch();
```

### Pattern 5: Rate Limiting

```typescript
// In queue registration
BullModule.registerQueue({
    name: GENERATION_QUEUE,
    limiter: {
        max: 10,           // Max 10 jobs
        duration: 60000,   // Per minute
    },
});

// Laravel Equivalent:
// Redis::throttle('key')->allow(10)->every(60)->then(function() {
//     // Job logic
// });
```

---

## 🔧 Debugging Commands

```bash
# Connect to Redis CLI
redis-cli

# View all Bull keys
KEYS bull:*

# View waiting jobs
LRANGE bull:generation:wait 0 -1

# View active jobs
LRANGE bull:generation:active 0 -1

# View completed jobs
LRANGE bull:generation:completed 0 -1

# View failed jobs
LRANGE bull:generation:failed 0 -1

# Clear all jobs from a queue (DANGEROUS!)
redis-cli FLUSHALL
```

---

## 📊 Quick Reference

| Action | NestJS/Bull | Laravel |
|--------|-------------|---------|
| Add job | `queue.add(data)` | `Job::dispatch($data)` |
| Delayed job | `queue.add(data, {delay: 5000})` | `dispatch()->delay(5)` |
| Get job | `queue.getJob(id)` | N/A |
| Remove job | `job.remove()` | `$job->delete()` |
| Retry job | `job.retry()` | `$job->release()` |
| Progress | `job.progress(value)` | N/A (manual) |
| Failed handler | `@OnQueueFailed()` | `failed()` method |
| Retry count | `job.attemptsMade` | `$this->attempts()` |
| Check state | `job.getState()` | N/A |

---

**Happy Queuing! 🚀**
