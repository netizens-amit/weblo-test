import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GenerationProcessor } from './generation.processor';
import { GENERATION_QUEUE } from './generation.queue';
import { OpencodeModule } from '../modules/opencode/opencode.module';
import { SessionModule } from '../modules/session/session.module';
import { FilesModule } from '../modules/files/files.module';
import { SseModule } from '../modules/sse/sse.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    // Configure Bull with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', ''),
        },
        defaultJobOptions: {
          removeOnComplete: 100,   // Keep last 100 completed jobs
          removeOnFail: 50,        // Keep last 50 failed jobs
          attempts: 3,             // Retry 3 times on failure
          backoff: {
            type: 'exponential',
            delay: 5000,           // Start with 5s delay
          },
        },
      }),
      inject: [ConfigService],
    }),
    
    // Register the generation queue
    BullModule.registerQueue({
      name: GENERATION_QUEUE,
    }),
    
    // Import required modules
    forwardRef(() => OpencodeModule),
    forwardRef(() => SessionModule),
    forwardRef(() => FilesModule),
    forwardRef(() => SseModule),
    PrismaModule,
  ],
  providers: [GenerationProcessor],
  exports: [BullModule],
})
export class QueueModule {}