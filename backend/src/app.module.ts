import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';
import { OpencodeModule } from './modules/opencode/opencode.module';
import { FilesModule } from './modules/files/files.module';
import { SessionModule } from './modules/session/session.module';
import { SseModule } from './modules/sse/sse.module';
import { AiModule } from './modules/ai/ai.module';
import { ConversationModule } from './conversation/conversation.module';
import { QueueModule } from './queue/queue.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ProjectModule,
        OpencodeModule,
        FilesModule,
        SessionModule,
        SseModule,
        AiModule,
        ConversationModule,
        QueueModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
