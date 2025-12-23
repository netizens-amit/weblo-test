import { forwardRef, Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { OpencodeModule } from '../opencode/opencode.module';
import { SessionModule } from '../session/session.module';
import { FilesModule } from '../files/files.module';
import { SseModule } from '../sse/sse.module';
import { ConversationModule } from 'src/conversation/conversation.module';
import { QueueModule } from 'src/queue/queue.module';

@Module({
    imports: [OpencodeModule, SessionModule, FilesModule, SseModule, ConversationModule, forwardRef(() => QueueModule),],
    controllers: [ProjectController],
    providers: [ProjectService],
    exports: [ProjectService],
})
export class ProjectModule { }
