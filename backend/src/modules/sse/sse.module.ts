import { Module, forwardRef } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { FilesModule } from '../files/files.module';

@Module({
    imports: [forwardRef(() => FilesModule)],
    controllers: [SseController],
    providers: [SseService],
    exports: [SseService],
})
export class SseModule { }

