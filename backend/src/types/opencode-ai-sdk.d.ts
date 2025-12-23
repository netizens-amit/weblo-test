declare module '@opencode-ai/sdk' {
    export function createOpencode(options: {
        hostname?: string;
        port?: number;
        timeout?: number;
        config?: any;
    }): Promise<{
        server: { url: string; close: () => void };
        client: any;
    }>;
}
