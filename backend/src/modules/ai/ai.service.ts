import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly model: string;

    constructor() {
        this.model = process.env.AI_MODEL || 'google/gemini-2.0-flash-exp:free';
        this.logger.log(`AI Service initialized with model: ${this.model}`);
    }

    /**
     * Generate content using AI (placeholder for future use)
     */
    async generate(prompt: string): Promise<string> {
        // This is a placeholder - actual AI calls go through OpenCode
        this.logger.log(`AI generate called with prompt: ${prompt.substring(0, 50)}...`);
        return `Generated content for: ${prompt}`;
    }
}
