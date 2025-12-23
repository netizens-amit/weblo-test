import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesGateway } from './files.gateway';
import { FileSyncService } from './file-sync.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [FilesService, FilesGateway, FileSyncService],
    exports: [FilesService, FilesGateway, FileSyncService],
})
export class FilesModule { }
