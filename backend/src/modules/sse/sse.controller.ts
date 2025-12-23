import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SseService } from './sse.service';

@Controller('api/sse')
export class SseController {
    constructor(private readonly sseService: SseService) { }

    @Get(':projectId')
    async subscribe(@Param('projectId') projectId: string, @Res() res: Response) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const emitter = this.sseService.getEmitter(projectId);

        const subscription = emitter.subscribe({
            next: (event) => {
                res.write(`event: ${event.type}\n`);
                res.write(`data: ${JSON.stringify(event.data)}\n\n`);
            },
            error: () => {
                res.end();
            },
            complete: () => {
                res.end();
            },
        });

        // Cleanup on disconnect
        res.on('close', () => {
            subscription.unsubscribe();
        });
    }
}
