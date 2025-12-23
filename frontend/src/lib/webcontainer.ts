/**
 * WebContainer Singleton Service
 * 
 * This module creates ONE WebContainer instance that lives
 * for the entire app lifetime. No React hooks needed!
 * 
 * Usage:
 *   import { getWebContainer } from '@/lib/webcontainer';
 *   const container = await getWebContainer();
 */

import { WebContainer } from '@webcontainer/api';

// The single instance - starts as null
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Get or boot the WebContainer singleton
 * 
 * This function is idempotent - call it as many times as you want,
 * it will only boot once and return the same instance.
 */
export async function getWebContainer(): Promise<WebContainer> {
    // Already have an instance? Return it immediately
    if (webcontainerInstance) {
        return webcontainerInstance;
    }

    // Already booting? Wait for it to complete
    if (bootPromise) {
        return bootPromise;
    }

    // Start booting with cross-origin isolation enabled
    console.log('🚀 [WebContainer] Booting singleton...');

    bootPromise = WebContainer.boot({
        coep: 'credentialless',  // Required for iframe preview
    });

    try {
        webcontainerInstance = await bootPromise;
        console.log('✅ [WebContainer] Singleton ready');
        return webcontainerInstance;
    } catch (error) {
        console.error('❌ [WebContainer] Boot failed:', error);
        bootPromise = null; // Reset so we can try again
        throw error;
    }
}

/**
 * Check if WebContainer is ready (booted)
 */
export function isWebContainerReady(): boolean {
    return webcontainerInstance !== null;
}

/**
 * Get the current instance (may be null if not booted)
 * Use this for synchronous checks only
 */
export function getWebContainerSync(): WebContainer | null {
    return webcontainerInstance;
}

/**
 * Convert flat files object to WebContainer directory format
 * 
 * Input:  { "src/App.jsx": "content...", "package.json": "{...}" }
 * Output: { src: { directory: { "App.jsx": { file: { contents: "..." } } } }, ... }
 */
export function convertToWebContainerFormat(files: Record<string, string>): Record<string, any> {
    const wcFiles: Record<string, any> = {};

    Object.entries(files).forEach(([filePath, content]) => {
        // Normalize path (remove leading slash, use forward slashes)
        let cleanPath = filePath.replace(/\\/g, '/');
        cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

        const parts = cleanPath.split('/');
        let current = wcFiles;

        // Navigate/create directory structure
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = { directory: {} };
            }
            current = current[part].directory;
        }

        // Add the file at the end
        const fileName = parts[parts.length - 1];
        current[fileName] = {
            file: { contents: content },
        };
    });

    return wcFiles;
}
