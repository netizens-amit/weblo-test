import { Module, forwardRef } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesGateway } from './files.gateway';
import { FileSyncService } from './file-sync.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SseModule } from '../sse/sse.module';

@Module({
    imports: [PrismaModule, forwardRef(() => SseModule)],
    providers: [FilesService, FilesGateway, FileSyncService],
    exports: [FilesService, FilesGateway, FileSyncService],
})
export class FilesModule { }

