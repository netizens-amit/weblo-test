// frontend/src/lib/artifact-parser.ts
// Parses bolt.diy style artifact streaming format

export interface ParsedAction {
    type: 'file' | 'shell';
    filePath?: string;
    content?: string;
    command?: string;
}

export interface ParsedArtifact {
    id: string;
    title: string;
    actions: ParsedAction[];
}

export interface ArtifactParserCallbacks {
    onArtifactOpen?: (artifact: { id: string; title: string }) => void;
    onArtifactClose?: (artifact: ParsedArtifact) => void;
    onActionStart?: (action: { type: string; filePath?: string }) => void;
    onActionComplete?: (action: ParsedAction) => void;
    onProgress?: (info: { filesCreated: number; currentFile?: string }) => void;
}

/**
 * Parser for bolt.diy style artifact streaming
 * 
 * Format:
 * <boltArtifact id="..." title="...">
 *   <boltAction type="file" filePath="...">
 *     file content here
 *   </boltAction>
 *   <boltAction type="shell">
 *     npm install
 *   </boltAction>
 * </boltArtifact>
 */
export class ArtifactParser {
    private buffer = '';
    private currentArtifact: ParsedArtifact | null = null;
    private currentAction: ParsedAction | null = null;
    private filesCreated = 0;
    private callbacks: ArtifactParserCallbacks;

    constructor(callbacks: ArtifactParserCallbacks = {}) {
        this.callbacks = callbacks;
    }

    /**
     * Parse streaming chunk of text
     */
    parse(chunk: string): void {
        this.buffer += chunk;
        this.processBuffer();
    }

    /**
     * Process the buffer for complete tags
     */
    private processBuffer(): void {
        // Look for boltArtifact open tag
        if (!this.currentArtifact) {
            const artifactMatch = this.buffer.match(/<boltArtifact\s+id="([^"]+)"\s+title="([^"]+)">/);
            if (artifactMatch) {
                this.currentArtifact = {
                    id: artifactMatch[1],
                    title: artifactMatch[2],
                    actions: [],
                };
                this.callbacks.onArtifactOpen?.({
                    id: artifactMatch[1],
                    title: artifactMatch[2],
                });
                // Remove matched portion
                this.buffer = this.buffer.slice(artifactMatch.index! + artifactMatch[0].length);
            }
        }

        // Look for boltAction open tag
        if (this.currentArtifact && !this.currentAction) {
            const fileActionMatch = this.buffer.match(/<boltAction\s+type="file"\s+filePath="([^"]+)">/);
            const shellActionMatch = this.buffer.match(/<boltAction\s+type="shell">/);

            if (fileActionMatch) {
                this.currentAction = {
                    type: 'file',
                    filePath: fileActionMatch[1],
                    content: '',
                };
                this.callbacks.onActionStart?.({
                    type: 'file',
                    filePath: fileActionMatch[1],
                });
                this.buffer = this.buffer.slice(fileActionMatch.index! + fileActionMatch[0].length);
            } else if (shellActionMatch) {
                this.currentAction = {
                    type: 'shell',
                    command: '',
                };
                this.callbacks.onActionStart?.({ type: 'shell' });
                this.buffer = this.buffer.slice(shellActionMatch.index! + shellActionMatch[0].length);
            }
        }

        // Look for boltAction close tag
        if (this.currentAction) {
            const closeIndex = this.buffer.indexOf('</boltAction>');
            if (closeIndex !== -1) {
                const content = this.buffer.slice(0, closeIndex).trim();

                if (this.currentAction.type === 'file') {
                    this.currentAction.content = content;
                    this.filesCreated++;
                } else if (this.currentAction.type === 'shell') {
                    this.currentAction.command = content;
                }

                this.callbacks.onActionComplete?.(this.currentAction);
                this.callbacks.onProgress?.({
                    filesCreated: this.filesCreated,
                    currentFile: this.currentAction.filePath,
                });

                if (this.currentArtifact) {
                    this.currentArtifact.actions.push(this.currentAction);
                }

                this.currentAction = null;
                this.buffer = this.buffer.slice(closeIndex + '</boltAction>'.length);
            } else {
                // Accumulate content for current action
                // Keep last 100 chars in buffer in case tag is split
                if (this.buffer.length > 100) {
                    const contentPart = this.buffer.slice(0, -100);
                    if (this.currentAction.type === 'file') {
                        this.currentAction.content = (this.currentAction.content || '') + contentPart;
                    } else if (this.currentAction.type === 'shell') {
                        this.currentAction.command = (this.currentAction.command || '') + contentPart;
                    }
                    this.buffer = this.buffer.slice(-100);
                }
            }
        }

        // Look for boltArtifact close tag
        if (this.currentArtifact && !this.currentAction) {
            const closeIndex = this.buffer.indexOf('</boltArtifact>');
            if (closeIndex !== -1) {
                this.callbacks.onArtifactClose?.(this.currentArtifact);
                this.currentArtifact = null;
                this.buffer = this.buffer.slice(closeIndex + '</boltArtifact>'.length);
                this.filesCreated = 0;
            }
        }
    }

    /**
     * Reset parser state
     */
    reset(): void {
        this.buffer = '';
        this.currentArtifact = null;
        this.currentAction = null;
        this.filesCreated = 0;
    }

    /**
     * Get current parsing state
     */
    getState(): {
        isInArtifact: boolean;
        isInAction: boolean;
        filesCreated: number;
        currentFile?: string;
    } {
        return {
            isInArtifact: this.currentArtifact !== null,
            isInAction: this.currentAction !== null,
            filesCreated: this.filesCreated,
            currentFile: this.currentAction?.filePath,
        };
    }
}
