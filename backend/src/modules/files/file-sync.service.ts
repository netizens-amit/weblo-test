
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs-extra';
import * as path from 'path';

interface FileData {
    path: string;
    content: string;
    size?: number;
}

@Injectable()
export class FileSyncService {
    private readonly logger = new Logger(FileSyncService.name);
    private readonly STORAGE_ROOT = path.join(process.cwd(), 'storage', 'projects');

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Save a file to both database and filesystem
     */
    async saveFile(
        projectId: string,
        filePath: string,
        content: string,
        reason?: string
    ): Promise<void> {
        const size = Buffer.byteLength(content, 'utf-8');
        const mimeType = this.getMimeType(filePath);

        try {
            // Check if file exists
            const existingFile = await this.prisma.projectFile.findUnique({
                where: {
                    projectId_path: { projectId, path: filePath },
                },
            });

            if (existingFile) {
                // Save version history
                await this.prisma.fileVersion.create({
                    data: {
                        fileId: existingFile.id,
                        version: existingFile.version,
                        content: existingFile.content,
                        reason: reason || 'Previous version',
                    },
                });

                // Update file
                await this.prisma.projectFile.update({
                    where: { id: existingFile.id },
                    data: {
                        content,
                        size,
                        version: { increment: 1 },
                    },
                });

                this.logger.debug(`📝 Updated file: ${filePath} (v${existingFile.version + 1})`);
            } else {
                // Create new file
                await this.prisma.projectFile.create({
                    data: {
                        projectId,
                        path: filePath,
                        content,
                        size,
                        mimeType,
                        version: 1,
                    },
                });

                this.logger.debug(`📄 Created file: ${filePath}`);
            }

            // Also write to filesystem
            await this.writeToFilesystem(projectId, filePath, content);
        } catch (error) {
            this.logger.error(`Failed to save file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Bulk save files after generation
     */
    async saveFiles(
        projectId: string,
        files: FileData[],
        reason?: string
    ): Promise<void> {
        this.logger.log(`💾 Saving ${files.length} files for project ${projectId}`);

        for (const file of files) {
            await this.saveFile(projectId, file.path, file.content, reason);
        }

        this.logger.log(`✅ Saved ${files.length} files to database`);
    }

    /**
     * Load all files for a project from database
     */
    async loadProjectFiles(projectId: string): Promise<Record<string, string>> {
        const files = await this.prisma.projectFile.findMany({
            where: { projectId },
            orderBy: { path: 'asc' },
        });

        const result: Record<string, string> = {};
        for (const file of files) {
            result[file.path] = file.content;
        }

        this.logger.debug(`📂 Loaded ${files.length} files from database`);
        return result;
    }

    /**
     * Load files from filesystem (fallback if not in database)
     */
    async loadFromFilesystem(projectId: string, sessionId?: string): Promise<Record<string, string>> {
        const projectPath = sessionId
            ? path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId)
            : path.join(this.STORAGE_ROOT, projectId);

        if (!await fs.pathExists(projectPath)) {
            return {};
        }

        const files: Record<string, string> = {};
        await this.readDirRecursive(projectPath, '', files);

        return files;
    }

    /**
     * Sync files from filesystem to database
     */
    async syncFromFilesystem(projectId: string, sessionId?: string): Promise<number> {
        const files = await this.loadFromFilesystem(projectId, sessionId);
        const fileEntries = Object.entries(files);

        if (fileEntries.length === 0) {
            return 0;
        }

        for (const [filePath, content] of fileEntries) {
            await this.saveFile(projectId, filePath, content, 'AI generation');
        }

        this.logger.log(`🔄 Synced ${fileEntries.length} files from filesystem to database`);
        return fileEntries.length;
    }

    /**
     * Get file version history
     */
    async getFileVersions(projectId: string, filePath: string) {
        const file = await this.prisma.projectFile.findUnique({
            where: {
                projectId_path: { projectId, path: filePath },
            },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                    take: 10,
                },
            },
        });

        return file?.versions || [];
    }

    /**
     * Restore file to previous version
     */
    async restoreVersion(projectId: string, filePath: string, version: number): Promise<boolean> {
        const file = await this.prisma.projectFile.findUnique({
            where: {
                projectId_path: { projectId, path: filePath },
            },
            include: {
                versions: {
                    where: { version },
                },
            },
        });

        if (!file || file.versions.length === 0) {
            return false;
        }

        const targetVersion = file.versions[0];

        // Save current as new version
        await this.prisma.fileVersion.create({
            data: {
                fileId: file.id,
                version: file.version,
                content: file.content,
                reason: 'Before restore',
            },
        });

        // Update file with restored content
        await this.prisma.projectFile.update({
            where: { id: file.id },
            data: {
                content: targetVersion.content,
                version: { increment: 1 },
            },
        });

        // Also write to filesystem
        await this.writeToFilesystem(projectId, filePath, targetVersion.content);

        this.logger.log(`⏪ Restored ${filePath} to version ${version}`);
        return true;
    }

    // Private helpers

    private async writeToFilesystem(projectId: string, filePath: string, content: string): Promise<void> {
        const fullPath = path.join(this.STORAGE_ROOT, projectId, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    private async readDirRecursive(
        basePath: string,
        relativePath: string,
        files: Record<string, string>
    ): Promise<void> {
        const currentPath = path.join(basePath, relativePath);
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            // Skip node_modules and hidden files
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                continue;
            }

            if (entry.isDirectory()) {
                await this.readDirRecursive(basePath, entryRelativePath, files);
            } else if (entry.isFile()) {
                try {
                    const content = await fs.readFile(path.join(basePath, entryRelativePath), 'utf-8');
                    files[entryRelativePath] = content;
                } catch (e) {
                    // Skip binary files or unreadable files
                }
            }
        }
    }

    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.js': 'text/javascript',
            '.jsx': 'text/javascript',
            '.ts': 'text/typescript',
            '.tsx': 'text/typescript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.md': 'text/markdown',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
        };
        return mimeTypes[ext] || 'text/plain';
    }
}
