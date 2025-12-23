import { Module } from '@nestjs/common';
import { OpencodeService } from './opencode.service';
import { SseModule } from '../sse/sse.module';

@Module({
    imports: [SseModule],
    providers: [OpencodeService],
    exports: [OpencodeService],
})
export class OpencodeModule { }
