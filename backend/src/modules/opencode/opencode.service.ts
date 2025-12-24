// backend/src/modules/opencode/opencode.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';

type Session = any;

const importOpencode = async () => {
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  return await dynamicImport('@opencode-ai/sdk');
};

@Injectable()
export class OpencodeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpencodeService.name);
  private server: any;
  private client: any;
  private readonly STORAGE_ROOT = path.join(process.cwd(), 'storage', 'projects');

  // Protected limits
  private readonly MAX_GENERATION_TIME = parseInt(process.env.MAX_GENERATION_TIME_MS || '180000');
  private readonly MAX_REFINEMENT_TIME = parseInt(process.env.MAX_REFINEMENT_TIME_MS || '120000');
  private readonly MAX_TOKENS = parseInt(process.env.MAX_TOKENS_PER_REQUEST || '8000');
  private readonly MAX_RETRIES = parseInt(process.env.MAX_RETRY_ATTEMPTS || '2');
  private readonly RETRY_DELAY = parseInt(process.env.RETRY_DELAY_MS || '3000');
  private readonly AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.3');

  private activeRequests = new Map<string, AbortController>();
  private healthCheckInterval: NodeJS.Timeout;
  private isServerRunning = false;
  private serverPort = 4096;

  async onModuleInit() {
    await this.initializeOpencode();
    this.startHealthCheck();
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    await this.closeServer();
  }

  private async closeServer() {
    if (this.server && this.isServerRunning) {
      try {
        await this.server.close();
        this.isServerRunning = false;
        this.logger.log('OpenCode server closed gracefully');
      } catch (error) {
        this.logger.error('Failed to close server:', error.message);
      }
    }
  }

  private startHealthCheck() {
    const interval = parseInt(process.env.OPENCODE_HEALTH_CHECK_INTERVAL_MS || '30000');
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isServerRunning) {
        this.logger.warn('⚠️ OpenCode server not running, attempting restart...');
        await this.initializeOpencode();
      }
    }, interval);
  }

  private async initializeOpencode() {
    this.logger.log('Starting OpenCode initialization...');
    try {
      await this.killPortProcess(this.serverPort);
      const { createOpencode } = await importOpencode();

      const targetModel = process.env.AI_MODEL || 'grok-code';
      const targetProvider = process.env.AI_PROVIDER || 'opencode';

      this.logger.log(`🤖 Target model: ${targetModel} (provider: ${targetProvider})`);

      const opencode = await createOpencode({
        hostname: '127.0.0.1',
        port: this.serverPort,
        timeout: 120000,
        config: {
          build: {
            model: targetModel,
            provider: targetProvider,
          },
        } as any,
      });

      this.server = opencode.server;
      this.client = opencode.client;
      this.isServerRunning = true;

      this.logger.log(` OpenCode server running at ${opencode.server.url}`);
    } catch (error) {
      this.isServerRunning = false;
      this.logger.error(' Failed to initialize OpenCode:', error);
      throw error;
    }
  }

  private async killPortProcess(port: number): Promise<void> {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      if (process.platform === 'win32') {
        await execPromise(`netstat -ano | findstr :${port}`).catch(() => { });
      } else {
        const { stdout } = await execPromise(`lsof -ti:${port}`).catch(() => ({ stdout: '' }));
        if (stdout.trim()) {
          await execPromise(`kill -9 ${stdout.trim()}`);
          this.logger.log(`Killed process on port ${port}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  async createSession(projectId: string, projectName: string): Promise<Session> {
    if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw new BadRequestException('Valid project ID is required for session creation');
    }

    if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
      throw new BadRequestException('Valid project name is required for session creation');
    }

    try {
      if (!this.client || !this.isServerRunning) {
        throw new InternalServerErrorException('OpenCode client not initialized. Please try again later.');
      }

      const projectPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', 'pending');
      await fs.ensureDir(projectPath);

      const session = await this.client.session.create({
        body: {
          title: `Weblo: ${projectName}`,
          directory: projectPath,
        },
      });

      const sessionId = session?.id || session?.session_id || session?.data?.id;

      if (!sessionId) {
        throw new InternalServerErrorException('Failed to extract session ID from OpenCode response');
      }

      const finalPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);
      await fs.move(projectPath, finalPath, { overwrite: true });

      this.logger.log(`Session ${sessionId} created at: ${finalPath}`);

      return session.data || { ...session, id: sessionId };
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(`Failed to create OpenCode session: ${error.message}`);
    }
  }

  // 🆕 UPDATED: Accept preferences parameter
  async generateWebsite(
    sessionId: string,
    projectId: string,
    userPrompt: string,
    plan?: any,
    preferences?: any // NEW parameter
  ): Promise<{ message: any; files: string[] }> {
    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      throw new BadRequestException('Valid session ID is required for website generation');
    }

    if (!projectId || typeof projectId !== 'string') {
      throw new BadRequestException('Valid project ID is required for website generation');
    }

    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
      throw new BadRequestException('Valid user prompt is required for website generation');
    }

    const abortController = new AbortController();
    const requestId = `${projectId}-generation`;
    this.activeRequests.set(requestId, abortController);

    const timeoutId = setTimeout(() => {
      this.logger.warn(`⚠️ Generation timeout after ${this.MAX_GENERATION_TIME}ms`);
      abortController.abort();
    }, this.MAX_GENERATION_TIME);

    try {
      const projectPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);
      await fs.ensureDir(projectPath);

      // 🆕 Build prompt using preferences if available
      const enhancedPrompt = preferences
        ? this.buildPromptFromPreferences(preferences, projectPath)
        : this.buildReactPromptFilesOnly(userPrompt, plan, projectPath);

      this.logger.log(`📝 Sending prompt to OpenCode (with preferences: ${preferences ? 'YES' : 'NO'})...`);

      const result = await this.executeWithRetry(async () => {
        return await this.client.session.prompt({
          path: { id: sessionId },
          body: {
            agent: 'build',
            model: {
              providerID: process.env.AI_PROVIDER || 'opencode',
              modelID: process.env.AI_MODEL || 'grok-code',
            },
            parts: [{
              type: 'text',
              text: enhancedPrompt,
            }],
            max_tokens: this.MAX_TOKENS,
            temperature: this.AI_TEMPERATURE,
          },
        });
      }, abortController.signal);

      clearTimeout(timeoutId);

      this.logger.log(`✅ OpenCode responded, waiting for files...`);

      // Wait for critical files
      const filesCreated = await this.waitForFilesWithRetry(
        projectPath,
        ['src/App.jsx', 'package.json', 'src/main.jsx'],
        90000
      );

      if (!filesCreated) {
        this.logger.warn(`⚠️ Files not created by OpenCode, trying fallback...`);
        const filesWritten = await this.parseAndWriteFiles(result, projectPath);

        if (filesWritten.length > 0) {
          this.logger.log(`✅ Fallback wrote ${filesWritten.length} files`);
          // Ensure config files exist
          await this.ensureConfigFiles(projectPath);
          return { message: result, files: filesWritten };
        } else {
          throw new Error('No files were created by OpenCode or fallback parser');
        }
      }

      // Ensure config files exist (vite.config.js, tailwind.config.js, postcss.config.js)
      await this.ensureConfigFiles(projectPath);

      // Ensure package.json has required dependencies based on components
      await this.ensurePackageDependencies(projectPath, userPrompt);

      // 🆕 Fix React hooks incorrectly imported from lucide-react
      await this.fixReactHookImports(projectPath);

      // Validate and fix missing imports in components
      await this.validateAndFixComponents(projectPath);

      // Create stub components for any missing imported files
      await this.validateAndFixMissingComponents(projectPath);

      // Fix named imports to default imports in App.jsx
      await this.validateAndFixAppImports(projectPath);

      const files = await this.getProjectFiles(projectPath);
      this.logger.log(`✅ Generated ${files.length} files successfully`);

      return { message: result, files };
    } catch (error) {
      // IMPORTANT: Even if API times out, files might have been created
      // Check for files before throwing error
      const projectPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);
      const existingFiles = await this.getProjectFiles(projectPath);


      if (existingFiles.length >= 5) {
        // Files were created despite API error - consider it a success
        this.logger.log(`✅ Despite API error, found ${existingFiles.length} files - treating as success`);
        // Still ensure config files
        await this.ensureConfigFiles(projectPath);
        await this.ensurePackageDependencies(projectPath, userPrompt);
        await this.fixReactHookImports(projectPath);  // 🆕 Fix React hooks
        await this.validateAndFixComponents(projectPath);
        await this.validateAndFixMissingComponents(projectPath);
        await this.validateAndFixAppImports(projectPath);
        return { message: null, files: existingFiles };
      }

      if (error.name === 'AbortError') {
        throw new Error(`Generation timeout: exceeded ${this.MAX_GENERATION_TIME}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  // 🆕 FALLBACK: Create missing config files
  private async ensureConfigFiles(projectPath: string): Promise<void> {
    const configs: Record<string, string> = {
      'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
      'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
    };

    for (const [filename, content] of Object.entries(configs)) {
      const filePath = path.join(projectPath, filename);
      if (!(await fs.pathExists(filePath))) {
        await fs.writeFile(filePath, content, 'utf-8');
        this.logger.log(`📝 Created fallback config: ${filename}`);
      }
    }
  }

  // 🆕 FALLBACK: Ensure package.json has all dependencies used in code
  private async ensurePackageDependencies(projectPath: string, prompt: string): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      return;
    }

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      packageJson.dependencies = packageJson.dependencies || {};
      let modified = false;

      // Known packages and their versions
      const knownPackages: Record<string, string> = {
        'react-router-dom': '^6.22.0',
        'framer-motion': '^11.0.0',
        'axios': '^1.6.7',
        'chart.js': '^4.4.1',
        'react-chartjs-2': '^5.2.0',
        'recharts': '^2.12.0',
        '@tanstack/react-query': '^5.17.0',
        'react-hook-form': '^7.49.0',
        'zod': '^3.22.0',
        'date-fns': '^3.3.0',
        'clsx': '^2.1.0',
        '@headlessui/react': '^1.7.18',
        'react-hot-toast': '^2.4.1',
        'react-icons': '^5.0.1',
      };

      // Scan all JSX/TSX files for imports
      const srcPath = path.join(projectPath, 'src');
      if (await fs.pathExists(srcPath)) {
        const allFiles = await this.getAllFiles(srcPath);

        for (const filePath of allFiles) {
          if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.ts')) {
            continue;
          }

          const content = await fs.readFile(filePath, 'utf-8');

          // Check for each known package
          for (const [pkg, version] of Object.entries(knownPackages)) {
            // Check if package is imported
            const importPattern = new RegExp(`from\\s+['"]${pkg.replace(/[-\/]/g, '\\$&')}['"]|import\\s*['"]${pkg.replace(/[-\/]/g, '\\$&')}['"]`);

            if (importPattern.test(content)) {
              if (!packageJson.dependencies[pkg] && !packageJson.devDependencies?.[pkg]) {
                packageJson.dependencies[pkg] = version;
                modified = true;
                this.logger.log(`📦 Auto-added missing dependency: ${pkg}@${version}`);
              }
            }
          }

          // Specific check for react-router-dom components
          if (content.includes('BrowserRouter') || content.includes('Routes') || content.includes('Route') || content.includes('Link')) {
            if (!packageJson.dependencies['react-router-dom'] && !content.includes("from 'lucide-react'") || content.includes("from 'react-router-dom'")) {
              // Only add if it looks like routing, not just Link icon
              if (content.includes("from 'react-router-dom'") || (content.includes('Routes') && content.includes('Route'))) {
                if (!packageJson.dependencies['react-router-dom']) {
                  packageJson.dependencies['react-router-dom'] = '^6.22.0';
                  modified = true;
                  this.logger.log(`📦 Auto-added react-router-dom (detected routing components)`);
                }
              }
            }
          }
        }
      }

      // Project type specific dependencies
      const projectType = this.detectProjectType(prompt);
      if (projectType.type === 'Dashboard' && projectType.components.includes('Chart')) {
        if (!packageJson.dependencies['chart.js']) {
          packageJson.dependencies['chart.js'] = '^4.4.1';
          modified = true;
          this.logger.log(`📦 Added chart.js dependency`);
        }
        if (!packageJson.dependencies['react-chartjs-2']) {
          packageJson.dependencies['react-chartjs-2'] = '^5.2.0';
          modified = true;
          this.logger.log(`📦 Added react-chartjs-2 dependency`);
        }
      }

      if (modified) {
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
        this.logger.log(`✅ Updated package.json with ${Object.keys(packageJson.dependencies).length} dependencies`);
      }
    } catch (error) {
      this.logger.error(`Failed to update package.json: ${error.message}`);
    }
  }

  // Helper to get all files recursively
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
          files.push(...await this.getAllFiles(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  // 🆕 FALLBACK: Validate and fix missing lucide-react imports in components
  private async validateAndFixComponents(projectPath: string): Promise<void> {
    const componentsDir = path.join(projectPath, 'src', 'components');

    if (!(await fs.pathExists(componentsDir))) {
      return;
    }

    try {
      const files = await fs.readdir(componentsDir);

      // Common lucide-react icons that might be used
      const knownIcons = [
        'BadgeCheck', 'UserPlus', 'FileText', 'Award', 'Menu', 'X', 'Home',
        'User', 'Settings', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
        'Search', 'Bell', 'LogOut', 'Plus', 'Minus', 'Edit', 'Trash', 'Check',
        'Clock', 'Calendar', 'Mail', 'Phone', 'MapPin', 'Star', 'Heart', 'Share',
        'Download', 'Upload', 'Eye', 'EyeOff', 'TrendingUp', 'TrendingDown',
        'Users', 'DollarSign', 'Activity', 'BarChart', 'PieChart', 'LineChart',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'RefreshCw', 'Loader',
        'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle', 'CheckCircle',
        'XCircle', 'Filter', 'MoreHorizontal', 'MoreVertical', 'Bookmark',
        'Tag', 'Folder', 'File', 'Image', 'Video', 'Music', 'Mic', 'Camera'
      ];

      const iconPattern = new RegExp(`\\b(${knownIcons.join('|')})\\b`, 'g');

      for (const file of files) {
        if (!file.endsWith('.jsx') && !file.endsWith('.tsx')) continue;

        const filePath = path.join(componentsDir, file);
        let content = await fs.readFile(filePath, 'utf-8');

        // Find all icons used in the file
        const usedIcons = [...new Set(content.match(iconPattern) || [])];

        // Check for existing lucide-react import (single or double quotes)
        const hasLucideImport = content.includes("from 'lucide-react'") ||
          content.includes('from "lucide-react"');

        if (usedIcons.length > 0 && !hasLucideImport) {
          // Add import at top of file
          const importStatement = `import { ${usedIcons.join(', ')} } from 'lucide-react';\n\n`;
          content = importStatement + content;
          await fs.writeFile(filePath, content, 'utf-8');
          this.logger.log(`📝 Fixed missing imports in ${file}: ${usedIcons.join(', ')}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to validate components: ${error.message}`);
    }
  }

  // 🆕 CRITICAL FIX: Fix React hooks incorrectly imported from lucide-react
  // AI sometimes generates: import { useState } from 'lucide-react' instead of 'react'
  private async fixReactHookImports(projectPath: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');

    if (!(await fs.pathExists(srcPath))) {
      return;
    }

    try {
      const allFiles = await this.getAllFiles(srcPath);
      const reactHooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue'];

      for (const filePath of allFiles) {
        if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) {
          continue;
        }

        let content = await fs.readFile(filePath, 'utf-8');
        let modified = false;

        // Pattern: import { useState, Menu } from 'lucide-react' or "lucide-react"
        // Need to separate hooks from icons
        const lucideImportPattern = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;

        let match;
        const newContent = content.replace(lucideImportPattern, (fullMatch, importList) => {
          const imports = importList.split(',').map((s: string) => s.trim()).filter((s: string) => s);

          const hooks: string[] = [];
          const icons: string[] = [];

          for (const imp of imports) {
            if (reactHooks.includes(imp)) {
              hooks.push(imp);
            } else {
              icons.push(imp);
            }
          }

          if (hooks.length === 0) {
            // No hooks found, return original
            return fullMatch;
          }

          modified = true;
          this.logger.log(`🔧 Fixed React hooks in ${path.basename(filePath)}: ${hooks.join(', ')} moved from lucide-react to react`);

          // Build new imports
          let result = `import { ${hooks.join(', ')} } from 'react'`;

          if (icons.length > 0) {
            result += `;\nimport { ${icons.join(', ')} } from 'lucide-react'`;
          }

          return result;
        });

        if (modified) {
          await fs.writeFile(filePath, newContent, 'utf-8');
        }
      }
    } catch (error) {
      this.logger.error(`Failed to fix React hook imports: ${error.message}`);
    }
  }

  // 🆕 FALLBACK: Create stub components for missing imported files
  private async validateAndFixMissingComponents(projectPath: string): Promise<void> {
    const appJsxPath = path.join(projectPath, 'src', 'App.jsx');

    if (!(await fs.pathExists(appJsxPath))) {
      return;
    }

    try {
      const appContent = await fs.readFile(appJsxPath, 'utf-8');

      // Find all imports from ./components/ AND ./pages/
      const componentImportRegex = /import\s+(\w+)\s+from\s+["']\.\/components\/(\w+)["']/g;
      const pageImportRegex = /import\s+(\w+)\s+from\s+["']\.\/pages\/(\w+)["']/g;

      const componentImports: { name: string; path: string; folder: string }[] = [];
      let match;

      // Find component imports
      while ((match = componentImportRegex.exec(appContent)) !== null) {
        componentImports.push({ name: match[1], path: match[2], folder: 'components' });
      }

      // Find page imports
      while ((match = pageImportRegex.exec(appContent)) !== null) {
        componentImports.push({ name: match[1], path: match[2], folder: 'pages' });
      }

      // Create missing files
      for (const { name, path: componentPath, folder } of componentImports) {
        const targetDir = path.join(projectPath, 'src', folder);
        await fs.ensureDir(targetDir);

        const jsxPath = path.join(targetDir, `${componentPath}.jsx`);
        const tsxPath = path.join(targetDir, `${componentPath}.tsx`);

        if (!(await fs.pathExists(jsxPath)) && !(await fs.pathExists(tsxPath))) {
          // Create a stub component
          const stubContent = this.generateStubComponent(name);
          await fs.writeFile(jsxPath, stubContent, 'utf-8');
          this.logger.log(`📝 Created stub ${folder}: ${componentPath}.jsx`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to validate missing components: ${error.message}`);
    }
  }

  // 🆕 FALLBACK: Fix named imports to default imports in App.jsx
  private async validateAndFixAppImports(projectPath: string): Promise<void> {
    const appJsxPath = path.join(projectPath, 'src', 'App.jsx');

    if (!(await fs.pathExists(appJsxPath))) {
      return;
    }

    try {
      let appContent = await fs.readFile(appJsxPath, 'utf-8');
      let modified = false;

      // Pattern to match named imports from ./components/ or ./pages/
      // import { ComponentName } from "./components/ComponentName"
      const namedImportPattern = /import\s*{\s*(\w+)\s*}\s*from\s*["']\.\/(components|pages)\/(\w+)["']/g;

      // Replace with default import
      // import ComponentName from "./components/ComponentName"
      const newContent = appContent.replace(namedImportPattern, (match, name, folder, path) => {
        this.logger.log(`📝 Fixed import: ${name} from {named} to default`);
        modified = true;
        return `import ${name} from "./${folder}/${path}"`;
      });

      if (modified) {
        await fs.writeFile(appJsxPath, newContent, 'utf-8');
        this.logger.log(`✅ Fixed named imports in App.jsx to use default imports`);
      }
    } catch (error) {
      this.logger.error(`Failed to fix App.jsx imports: ${error.message}`);
    }
  }


  // Generate a basic stub component
  private generateStubComponent(name: string): string {
    // Different templates based on component name
    const templates: Record<string, string> = {
      Footer: `function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Company</h3>
            <p className="text-gray-400">Building amazing experiences.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition">Home</a></li>
              <li><a href="#" className="hover:text-white transition">About</a></li>
              <li><a href="#" className="hover:text-white transition">Services</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>contact@example.com</li>
              <li>+1 (555) 123-4567</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition">Twitter</a>
              <a href="#" className="text-gray-400 hover:text-white transition">LinkedIn</a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; ${new Date().getFullYear()} Company. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;`,
      Header: `function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">Logo</div>
          <div className="hidden md:flex space-x-8">
            <a href="#" className="text-gray-600 hover:text-gray-900 transition">Home</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition">About</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition">Services</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition">Contact</a>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;`,
      Hero: `function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Welcome to Our Site</h1>
        <p className="text-xl md:text-2xl mb-8 text-blue-100">
          Building amazing digital experiences
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition">
            Get Started
          </button>
          <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;`,
    };

    // Return specific template or generic one
    if (templates[name]) {
      return templates[name];
    }

    // Generic stub component
    return `function ${name}() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">${name}</h2>
        <p className="text-center text-gray-600">
          This is the ${name} section. Content coming soon.
        </p>
      </div>
    </section>
  );
}

export default ${name};`;
  }

  // 🆕 NEW METHOD: Build comprehensive prompt from user preferences
  private buildPromptFromPreferences(preferences: any, projectPath: string): string {
    const {
      businessName,
      industry,
      description,
      email,
      pages,
      theme,
      brandFeel,
      features
    } = preferences;

    // Detect Intent: Landing Page vs Full Website
    // If only 'home' is selected or pages list is empty -> Landing Page (SPA)
    // If multiple pages are selected -> Full Website (MPA)
    const isMultiPage = pages && (pages.length > 1 || (pages.length === 1 && pages[0].toLowerCase() !== 'home'));
    const structureType = isMultiPage ? 'Multi-Page Application (MPA)' : 'Single Page Landing Website (SPA)';

    // Theme/Color scheme mapping
    const themeConfig = {
      dark: {
        background: '#0a0a0a',
        foreground: '#ffffff',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#ec4899',
      },
      light: {
        background: '#ffffff',
        foreground: '#0a0a0a',
        primary: '#3b82f6',
        secondary: '#0ea5e9',
        accent: '#f59e0b',
      },
      auto: {
        background: '#ffffff',
        foreground: '#1f2937',
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#8b5cf6',
      }
    };

    const colors = themeConfig[theme] || themeConfig.auto;

    // Brand feel to design style mapping
    const brandStyleMap = {
      modern: {
        description: 'clean lines, bold typography, ample white space, subtle glass morphism',
        fonts: "'Inter', 'SF Pro Display', sans-serif",
        cornerRadius: 'rounded-lg',
      },
      minimal: {
        description: 'ultra-simple, lots of white space, monochromatic with subtle accents',
        fonts: "'Helvetica Neue', 'Arial', sans-serif",
        cornerRadius: 'rounded',
      },
      professional: {
        description: 'corporate, structured grid layouts, conservative color palette, trust-building',
        fonts: "'Roboto', 'Open Sans', sans-serif",
        cornerRadius: 'rounded-md',
      },
      corporate: {
        description: 'formal, blue/gray tones, professional imagery, enterprise-grade feel',
        fonts: "'IBM Plex Sans', sans-serif",
        cornerRadius: 'rounded-sm',
      },
      colorful: {
        description: 'vibrant gradients, multiple accent colors, playful illustrations, energetic',
        fonts: "'Poppins', 'Nunito', sans-serif",
        cornerRadius: 'rounded-2xl',
      },
      monochrome: {
        description: 'black and white with gray accents, strong typography, high contrast',
        fonts: "'Space Grotesk', monospace",
        cornerRadius: 'rounded-none',
      },
      playful: {
        description: 'rounded corners, bright colors, fun animations, casual friendly tone',
        fonts: "'Quicksand', 'Comic Neue', sans-serif",
        cornerRadius: 'rounded-3xl',
      },
      elegant: {
        description: 'sophisticated serif fonts, subtle animations, luxury feel, muted gold accents',
        fonts: "'Playfair Display', 'Lora', serif",
        cornerRadius: 'rounded-lg',
      },
    };

    const designStyle = brandStyleMap[(brandFeel || 'modern').toLowerCase()] || brandStyleMap['modern'];

    // Features to component mapping
    const featureComponents = {
      'let-ai-decide': null,
      'contact-form': {
        name: 'ContactForm',
        description: 'Contact form with name, email, message fields, validation, and submit button',
      },
      'photo-gallery': {
        name: 'PhotoGallery',
        description: 'Photo gallery grid with placeholder images and lightbox effect',
      },
      'blog': {
        name: 'Blog',
        description: 'Blog section with article cards showing title, excerpt, date, and read more button',
      },
      'booking-system': {
        name: 'BookingSystem',
        description: 'Booking/Appointment calendar with date picker and time slots',
      },
      'testimonials': {
        name: 'Testimonials',
        description: 'Testimonials carousel with customer reviews, ratings, and photos',
      },
      'ecommerce': {
        name: 'ProductGrid',
        description: 'Product grid with images, prices, add to cart buttons, and shopping cart',
      },
      'ai-content': null,
    };

    const requiredFeatures = (features || [])
      .filter(f => f !== 'let-ai-decide' && f !== 'ai-images' && featureComponents[f])
      .map(f => featureComponents[f]);

    const businessNameSafe = businessName || 'My Business';
    const industrySafe = industry || 'Business';
    const descriptionSafe = description || 'A professional business website';
    const emailSafe = email || 'contact@business.com';

    // Build Page List
    const pageList = (pages || ['home']).map(p => p.toLowerCase());

    return `You are a world-class React developer creating a stunning, production-ready website.

═══════════════════════════════════════════════════
🎯 PROJECT BRIEF
═══════════════════════════════════════════════════

Business Information:
• Company Name: ${businessNameSafe}
• Industry: ${industrySafe}
• Email: ${emailSafe}
• Description: ${descriptionSafe}
• Structure Strategy: ${structureType}

═══════════════════════════════════════════════════
🎨 DESIGN SPECIFICATIONS
═══════════════════════════════════════════════════

Visual Style: ${brandFeel?.toUpperCase() || 'MODERN'}
• Theme: ${theme} mode
• Design Language: ${designStyle.description}
• Typography: ${designStyle.fonts}
• Border Radius: ${designStyle.cornerRadius}

Color Palette:
• Background: ${colors.background}
• Foreground: ${colors.foreground}
• Primary: ${colors.primary}
• Secondary: ${colors.secondary}
• Accent: ${colors.accent}

Requested Pages:
${pageList.map((p, i) => `  ${i + 1}. ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n')}

${requiredFeatures.length > 0 ? `
Required Features/Components:
${requiredFeatures.map((f, i) => `  ${i + 1}. ${f.name}: ${f.description}`).join('\n')}
` : ''}

═══════════════════════════════════════════════════
⚙️ TECHNICAL STACK
═══════════════════════════════════════════════════

• React 18.2.0
• Vite 5.x
• Tailwind CSS 3.4.x
• Lucide React (icons)
${isMultiPage ? '• React Router DOM 6.x (REQUIRED for navigation)' : '• Single Page Scroll Navigation (NO Router)'}
• Working Directory: ${projectPath}

═══════════════════════════════════════════════════
📁 PROJECT STRUCTURE
═══════════════════════════════════════════════════

Create these EXACT files using the file_write tool:

📦 package.json (root):
{
  "name": "${businessNameSafe.toLowerCase().replace(/\\s+/g, '-')}-website",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"${isMultiPage ? ',\n    "react-router-dom": "^6.22.0"' : ''}
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.0",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}

📄 index.html (root):
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${descriptionSafe.substring(0, 150)}" />
    <title>${businessNameSafe} - ${industrySafe}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

⚙️ vite.config.js (root):
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
})

⚙️ tailwind.config.js (root):
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '${colors.primary}',
        secondary: '${colors.secondary}',
        accent: '${colors.accent}',
      }
    },
  },
  plugins: [],
}

⚙️ postcss.config.js (root):
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

🎨 src/index.css:
@tailwind base;
@tailwind components;
@tailwind utilities;

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: ${designStyle.fonts};
  background-color: ${colors.background};
  color: ${colors.foreground};
  line-height: 1.6;
}
#root { min-height: 100vh; width: 100%; }

⚛️ src/main.jsx:
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

═══════════════════════════════════════════════════
🚀 APPLICATION ARCHITECTURE (${structureType})
═══════════════════════════════════════════════════

${isMultiPage ? `
[MULTI-PAGE STRATEGY REQURIED]
1. src/App.jsx MUST use <BrowserRouter>, <Routes>, and <Route>.
2. CREATE INDIVIDUAL PAGE COMPONENTS in 'src/pages/':
   ${pageList.map(p => `- src/pages/${p.charAt(0).toUpperCase() + p.slice(1)}.jsx`).join('\n   ')}
3. src/components/Header.jsx MUST use <Link to="..."> for navigation.
4. DO NOT use anchor tags for internal navigation.
` : `
[SINGLE-PAGE STRATEGY REQUIRED]
1. src/App.jsx must render ALL sections in one vertical layout.
2. CREATE SECTIONS in 'src/components/':
   ${pageList.map(p => p !== 'home' ? `- src/components/${p.charAt(0).toUpperCase() + p.slice(1)}Section.jsx` : '').filter(Boolean).join('\n   ')}
   - src/components/Hero.jsx
3. src/components/Header.jsx MUST use <a href="#section"> for scroll navigation.
4. NO react-router-dom allowed.
`}

═══════════════════════════════════════════════════
💎 STYLING REQUIREMENTS
═══════════════════════════════════════════════════

• Use ONLY Tailwind CSS.
• Theme: ${theme}.
• Style: ${designStyle.description}.
• Fully responsive (mobile-first).

═══════════════════════════════════════════════════
✅ EXECUTION RULES
═══════════════════════════════════════════════════

✓ Use file_write tool for EVERY file.
✓ Write COMPLETE, working code.
✓ Use ONLY packages in package.json.
${isMultiPage ? '✓ IMPLEMENT ROUTING.' : '✓ IMPLEMENT SCROLL NAV.'}

Create ALL files NOW using the file_write tool. Start with package.json!`;
  }

  // FIXED: Use working prompt format with dynamic project type detection
  private buildReactPromptFilesOnly(userPrompt: string, plan: any, projectPath: string): string {
    // Detect project type from user prompt
    const projectType = this.detectProjectType(userPrompt);

    const systemContext = plan ? `
DESIGN SPECIFICATIONS:
- Tech Stack: React 18 + Vite + Tailwind CSS
- Color Scheme: ${plan.colorScheme?.primary || '#3B82F6'} primary
- Project Type: ${projectType.type}
- Components: ${projectType.components.join(', ')}
` : `
PROJECT TYPE: ${projectType.type}
REQUIRED COMPONENTS: ${projectType.components.join(', ')}
`;

    return `You are a professional React developer creating a production-ready React 18 application.

${systemContext}

USER REQUEST: ${userPrompt}

CRITICAL INSTRUCTIONS:
1. Your working directory is: ${projectPath}
2. Create COMPLETE React project structure with ALL files
3. Use React 18 functional components with hooks
4. DO NOT start any development server
5. DO NOT run npm install or any commands
6. ONLY create the files using file_write tool

REQUIRED FILES TO CREATE:

📦 **package.json** (root):
{
  "name": "weblo-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.0",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}

📄 **index.html** (root):
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weblo App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

🎨 **src/index.css**:
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

⚛️ **src/App.jsx** - Main component:
- Root div MUST have: className="min-h-screen w-full bg-white"
- Create complete, functional React app
- Use Tailwind CSS for ALL styling
- Create modular components in src/components/
- Make fully responsive (mobile-first)
- Use lucide-react for icons (already in package.json)

📂 **src/components/** - Create these components based on project type:
${projectType.components.map(c => `- ${c}.jsx`).join('\n')}

EXECUTION RULES:
✅ Use file_write tool for EVERY file
✅ Write COMPLETE code (no truncation)
✅ Ensure ALL imports are correct
✅ Make production-ready
❌ DO NOT start dev server
❌ DO NOT run npm commands
❌ DO NOT import packages not in package.json

Begin creating ALL files now.`;
  }

  // NEW: Detect project type from user prompt
  private detectProjectType(prompt: string): { type: string; components: string[] } {
    const lowerPrompt = prompt.toLowerCase();

    // Dashboard / Admin / LMS / CRM / Analytics
    if (/dashboard|admin|panel|analytics|crm|lms|erp|inventory|management\s*system/.test(lowerPrompt)) {
      return {
        type: 'Dashboard',
        components: ['Sidebar', 'TopBar', 'StatsCard', 'DataTable', 'Chart', 'RecentActivity']
      };
    }

    // E-commerce / Store / Shop
    if (/shop|store|ecommerce|e-commerce|product|cart|checkout/.test(lowerPrompt)) {
      return {
        type: 'E-commerce',
        components: ['Header', 'Hero', 'ProductGrid', 'ProductCard', 'Cart', 'Footer']
      };
    }

    // Portfolio / Personal
    if (/portfolio|personal|photographer|artist|designer/.test(lowerPrompt)) {
      return {
        type: 'Portfolio',
        components: ['Header', 'Hero', 'Gallery', 'About', 'Contact', 'Footer']
      };
    }

    // Blog / Content
    if (/blog|article|content|news|magazine/.test(lowerPrompt)) {
      return {
        type: 'Blog',
        components: ['Header', 'Hero', 'ArticleList', 'ArticleCard', 'Sidebar', 'Footer']
      };
    }

    // Landing / SaaS / Startup
    if (/landing|saas|startup|launch|waitlist/.test(lowerPrompt)) {
      return {
        type: 'Landing Page',
        components: ['Header', 'Hero', 'Features', 'Pricing', 'Testimonials', 'CTA', 'Footer']
      };
    }

    // Default: Website
    return {
      type: 'Website',
      components: ['Header', 'Hero', 'Features', 'About', 'Contact', 'Footer']
    };
  }


  // RETRY LOGIC
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        return await fn();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt}/${this.MAX_RETRIES} failed: ${error.message}`);

        if (attempt === this.MAX_RETRIES) break;

        const delay = this.RETRY_DELAY * attempt;
        this.logger.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          this.logger.log('🔄 Reinitializing OpenCode client...');
          await this.initializeOpencode();
        }
      }
    }

    throw lastError;
  }

  // WAIT FOR FILES
  private async waitForFilesWithRetry(
    directory: string,
    filenames: string[],
    timeout = 90000
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000;

    while (Date.now() - startTime < timeout) {
      const allExist = await Promise.all(
        filenames.map(async (file) => {
          const filePath = path.join(directory, file);
          const exists = await fs.pathExists(filePath);

          if (exists) {
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            return stats.size > 50 && content.trim().length > 20;
          }

          return false;
        })
      );

      if (allExist.every(exists => exists)) {
        this.logger.log(`✅ All required files created`);
        return true;
      }

      const existingFiles = await this.getProjectFiles(directory);
      this.logger.log(`⏳ Waiting... Found ${existingFiles.length} files so far`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    this.logger.warn(`⚠️ Timeout after ${timeout}ms`);
    return false;
  }

  // PARSE AND WRITE FILES (FALLBACK)
  private async parseAndWriteFiles(result: any, projectPath: string): Promise<string[]> {
    const filesWritten: string[] = [];

    try {
      const parts = result?.data?.parts || [];

      for (const part of parts) {
        if (part.type === 'text' && part.text) {
          const fileWriteRegex = /<file_write>\s*<path>(.*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/file_write>/g;
          let match;

          while ((match = fileWriteRegex.exec(part.text)) !== null) {
            let filePath = match[1].trim();
            let content = match[2].trim();

            if (filePath.startsWith('./')) filePath = filePath.slice(2);

            const targetPath = path.join(projectPath, filePath);
            await fs.ensureDir(path.dirname(targetPath));
            await fs.writeFile(targetPath, content, 'utf-8');

            this.logger.log(`📝 Fallback wrote: ${filePath}`);
            filesWritten.push(filePath);
          }
        }
      }
    } catch (error) {
      this.logger.error('Fallback parser error:', error);
    }

    return filesWritten;
  }

  // GET PROJECT FILES
  private async getProjectFiles(directory: string, basePath = ''): Promise<string[]> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
          const subFiles = await this.getProjectFiles(fullPath, relativePath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  // READ FILE
  async readFile(projectId: string, sessionId: string, filename: string): Promise<string> {
    if (!projectId || !sessionId || !filename) {
      this.logger.warn(`Invalid parameters for readFile: projectId=${projectId}, sessionId=${sessionId}, filename=${filename}`);
      return '';
    }

    try {
      const filePath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId, filename);

      if (await fs.pathExists(filePath)) {
        return await fs.readFile(filePath, 'utf-8');
      }

      return '';
    } catch (error) {
      this.logger.error(`Failed to read file ${filename}: ${error.message}`);
      return '';
    }
  }

  // WRITE FILE
  async writeFile(
    projectId: string,
    sessionId: string,
    filename: string,
    content: string
  ): Promise<void> {
    if (!projectId || typeof projectId !== 'string') {
      throw new BadRequestException('Valid project ID is required for writing file');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new BadRequestException('Valid session ID is required for writing file');
    }

    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Valid filename is required for writing file');
    }

    try {
      const filePath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');

      this.logger.log(`✍️ Updated: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to write file ${filename}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to write file: ${error.message}`);
    }
  }

  // GET PROJECT PATH
  getProjectPath(projectId: string, sessionId: string): string {
    return path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);
  }

  // REFINE WEBSITE
  async refineWebsite(
    sessionId: string,
    projectId: string,
    refinementPrompt: string
  ): Promise<{ message: any; files: string[] }> {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new BadRequestException('Valid session ID is required for refinement');
    }

    if (!projectId || typeof projectId !== 'string') {
      throw new BadRequestException('Valid project ID is required for refinement');
    }

    if (!refinementPrompt || typeof refinementPrompt !== 'string' || refinementPrompt.trim().length === 0) {
      throw new BadRequestException('Valid refinement prompt is required');
    }

    const abortController = new AbortController();
    const requestId = `${projectId}-refinement`;
    this.activeRequests.set(requestId, abortController);

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.MAX_REFINEMENT_TIME);

    try {
      const projectPath = path.join(this.STORAGE_ROOT, projectId, 'sessions', sessionId);

      const currentFiles = await this.getProjectFiles(projectPath);

      const fileContext = await Promise.all(
        currentFiles.slice(0, 10).map(async (file) => {
          const content = await this.readFile(projectId, sessionId, file);
          return `\n\n=== ${file} ===\n${content.slice(0, 2000)}`;
        })
      );

      const contextPrompt = `You are refining an existing React application.

CURRENT PROJECT CONTEXT:
${fileContext.join('\n')}

USER'S REFINEMENT REQUEST:
${refinementPrompt}

INSTRUCTIONS:
- Modify ONLY the files that need changes
- Maintain existing file structure
- Keep existing styling and component logic intact
- Use file_write tool to update files
- DO NOT start dev server or run npm commands

Apply the requested changes now.`;

      const result = await this.executeWithRetry(async () => {
        return await this.client.session.prompt({
          path: { id: sessionId },
          body: {
            agent: 'build',
            model: {
              providerID: process.env.AI_PROVIDER || 'opencode',
              modelID: process.env.AI_MODEL || 'grok-code',
            },
            parts: [{
              type: 'text',
              text: contextPrompt,
            }],
            max_tokens: this.MAX_TOKENS,
            temperature: this.AI_TEMPERATURE,
          },
        });
      }, abortController.signal);

      clearTimeout(timeoutId);

      await new Promise(resolve => setTimeout(resolve, 5000));

      const files = await this.getProjectFiles(projectPath);
      this.logger.log(`✅ Refined ${files.length} files`);

      return { message: result, files };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Refinement timeout: exceeded ${this.MAX_REFINEMENT_TIME}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }
}