import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { FilesGateway } from './files.gateway';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly STORAGE_ROOT = path.join(process.cwd(), 'storage', 'projects');
  private watchers = new Map<string, chokidar.FSWatcher>();

  // 🔄 DEBOUNCE MAP (prevents spam)
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_MS = 500;

  constructor(
    @Inject(forwardRef(() => FilesGateway))
    private gateway: FilesGateway
  ) { }

  /**
   * 👁️ Watch project directory (with debouncing)
   */
  watchProject(projectId: string, sessionId: string) {
    const projectPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);
    const watchKey = `${projectId}:${sessionId}`;

    if (this.watchers.has(watchKey)) {
      this.logger.log(`Already watching ${watchKey}`);
      return;
    }

    try {
      fs.ensureDirSync(projectPath);

      const watcher = chokidar.watch(projectPath, {
        ignored: /(^|[\/\\])\.|node_modules|dist|\.git/, // Ignore dotfiles, node_modules, dist
        persistent: true,
        ignoreInitial: true, // Don't emit events for existing files on startup
        awaitWriteFinish: {
          stabilityThreshold: 300, // Wait 300ms after last write
          pollInterval: 100,
        },
      });

      watcher
        .on('change', (filePath) => {
          this.debouncedFileChange(projectId, filePath, 'change');
        })
        .on('add', (filePath) => {
          this.debouncedFileChange(projectId, filePath, 'add');
        })
        .on('unlink', (filePath) => {
          this.logger.log(`File deleted: ${path.basename(filePath)}`);
        });

      this.watchers.set(watchKey, watcher);
      this.logger.log(`✅ Started watching ${projectPath}`);

      // Send initial files to client
      this.sendInitialFiles(projectId, projectPath);
    } catch (e) {
      this.logger.error(`Failed to watch directory ${projectPath}`, e);
    }
  }

  /**
   * 🔄 DEBOUNCED FILE CHANGE HANDLER
   */
  private debouncedFileChange(projectId: string, filePath: string, eventType: 'add' | 'change') {
    const filename = path.relative(
      path.join(this.STORAGE_ROOT, projectId, 'sessions'),
      filePath
    );

    const debounceKey = `${projectId}:${filename}`;

    // Clear existing timer
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        this.logger.log(`📝 ${eventType === 'add' ? 'File added' : 'File changed'}: ${filename}`);

        this.gateway.emitFileChange(projectId, {
          filename,
          content,
          timestamp: new Date().toISOString(),
          isNew: eventType === 'add',
        });
      } catch (error) {
        this.logger.error(`Failed to read file ${filename}:`, error);
      } finally {
        this.debounceTimers.delete(debounceKey);
      }
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(debounceKey, timer);
  }

  /**
   * 📦 Send initial files when client connects
   */
  private async sendInitialFiles(projectId: string, projectPath: string) {
    try {
      const files = await this.readProjectFilesRecursive(projectPath);

      this.logger.log(`📤 Sending ${files.length} initial files to client`);

      for (const file of files) {
        this.gateway.emitFileChange(projectId, {
          filename: file.filename,
          content: file.content,
          timestamp: new Date().toISOString(),
          isInitial: true,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send initial files:', error);
    }
  }

  /**
   * Stop watching project
   */
  unwatchProject(projectId: string, sessionId: string) {
    const watchKey = `${projectId}:${sessionId}`;
    const watcher = this.watchers.get(watchKey);

    if (watcher) {
      watcher.close();
      this.watchers.delete(watchKey);
      this.logger.log(`Stopped watching ${watchKey}`);
    }

    // Clear any pending debounce timers
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (key.startsWith(`${projectId}:`)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    }
  }

  /**
   * 📂 Read all project files (recursive)
   */
  async readProjectFiles(projectId: string, sessionId: string): Promise<any[]> {
    const projectPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);

    if (!(await fs.pathExists(projectPath))) {
      return [];
    }

    return this.readProjectFilesRecursive(projectPath);
  }

  /**
   * 📂 Recursive file reader (for React project structure)
   */
  private async readProjectFilesRecursive(
    directory: string,
    basePath = ''
  ): Promise<Array<{ filename: string; content: string }>> {
    const files: Array<{ filename: string; content: string }> = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        // CRITICAL FIX: Use forward slashes for WebContainer compatibility
        const relativePath = (basePath ? basePath + '/' + entry.name : entry.name);

        // Skip ignored directories
        if (entry.isDirectory()) {
          if (['node_modules', 'dist', '.git', '.vscode'].includes(entry.name)) {
            continue;
          }

          // Recursively read subdirectories
          const subFiles = await this.readProjectFilesRecursive(fullPath, relativePath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Read file content
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            filename: relativePath,
            content,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to read directory ${directory}:`, error);
    }

    return files;
  }

  /**
   * ✍️ Write file (manual edit)
   */
  async writeFile(
    projectId: string,
    sessionId: string,
    filename: string,
    content: string
  ): Promise<void> {
    const filePath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId, filename);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
    this.logger.log(`✍️ Written file: ${filename}`);
  }

  /**
   * 💾 Save version snapshot
   */
  async saveVersion(
    projectId: string,
    sessionId: string,
    versionNumber: number,
    files: Record<string, string>
  ): Promise<void> {
    const versionPath = path.join(
      this.STORAGE_ROOT,
      projectId,
      'sessions',
      sessionId,
      'versions',
      `v${versionNumber}`
    );

    await fs.ensureDir(versionPath);

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(versionPath, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    }

    this.logger.log(`💾 Saved version ${versionNumber} for project ${projectId}`);
  }

  /**
   * 🔄 Restore from version
   */
  async restoreVersion(
    projectId: string,
    sessionId: string,
    versionNumber: number
  ): Promise<Record<string, string>> {
    const versionPath = path.join(
      this.STORAGE_ROOT,
      projectId,
      'sessions',
      sessionId,
      'versions',
      `v${versionNumber}`
    );

    const files = await this.readProjectFilesRecursive(versionPath);
    const restored: Record<string, string> = {};

    for (const file of files) {
      restored[file.filename] = file.content;

      // Restore to main directory
      await this.writeFile(projectId, sessionId, file.filename, file.content);
    }

    return restored;
  }

  async deleteProject(projectId: string) {
    const projectPath = path.join(this.STORAGE_ROOT, projectId);
    await fs.remove(projectPath);
    this.logger.log(`🗑️ Deleted project ${projectId}`);
  }

  /**
   * 🗑️ Cleanup old watchers
   */
  async cleanup() {
    for (const [key, watcher] of this.watchers.entries()) {
      watcher.close();
      this.logger.log(`Cleaned up watcher: ${key}`);
    }
    this.watchers.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}