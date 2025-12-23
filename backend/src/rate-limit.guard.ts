import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  projectRefinements: Map<string, number>; // Track refinements per project
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly userLimits = new Map<string, RateLimitRecord>();
  
  // 🔒 CONFIGURABLE LIMITS FROM .ENV
  private readonly WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute
  private readonly MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20');
  private readonly MAX_REFINEMENTS_PER_PROJECT = parseInt(process.env.MAX_REQUESTS_PER_PROJECT || '10');
  private readonly MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '3');

  constructor(private reflector: Reflector) {
    // Cleanup expired records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const projectId = request.params?.id;
    const path = request.route?.path || '';

    // Get or create user record
    if (!this.userLimits.has(userId)) {
      this.userLimits.set(userId, {
        count: 0,
        resetTime: Date.now() + this.WINDOW_MS,
        projectRefinements: new Map(),
      });
    }

    const record = this.userLimits.get(userId)!;
    const now = Date.now();

    // ⏰ RESET WINDOW IF EXPIRED
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.WINDOW_MS;
      record.projectRefinements.clear();
    }

    // 🚫 CHECK GLOBAL RATE LIMIT
    if (record.count >= this.MAX_REQUESTS) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 🚫 CHECK PER-PROJECT REFINEMENT LIMIT
    if (path.includes('/refine') && projectId) {
      const projectRefinements = record.projectRefinements.get(projectId) || 0;
      
      if (projectRefinements >= this.MAX_REFINEMENTS_PER_PROJECT) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Maximum ${this.MAX_REFINEMENTS_PER_PROJECT} refinements per project reached. Create a new project to continue.`,
            limit: this.MAX_REFINEMENTS_PER_PROJECT,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      record.projectRefinements.set(projectId, projectRefinements + 1);
    }

    // 🚫 CHECK CONCURRENT GENERATIONS
    if (path.includes('/projects') && request.method === 'POST') {
      const activeGenerations = this.countActiveGenerations(userId);
      
      if (activeGenerations >= this.MAX_CONCURRENT) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Maximum ${this.MAX_CONCURRENT} concurrent generations allowed. Please wait for existing projects to complete.`,
            activeGenerations,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    // ✅ INCREMENT COUNTER
    record.count++;

    // Add rate limit headers
    request.res.setHeader('X-RateLimit-Limit', this.MAX_REQUESTS.toString());
    request.res.setHeader('X-RateLimit-Remaining', (this.MAX_REQUESTS - record.count).toString());
    request.res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    return true;
  }

  /**
   * Count active generations for user (would need to check project status in real impl)
   */
  private countActiveGenerations(userId: string): number {
    // This would query the database for PENDING/GENERATING projects
    // For now, return 0 (implement with ProjectService injection)
    return 0;
  }

  /**
   * Cleanup expired records
   */
  private cleanup() {
    const now = Date.now();
    for (const [userId, record] of this.userLimits.entries()) {
      if (now > record.resetTime + this.WINDOW_MS) {
        this.userLimits.delete(userId);
      }
    }
  }
}

// Usage in project.controller.ts:
// @UseGuards(RateLimitGuard)
// @Post()
// async createProject(...) { ... }