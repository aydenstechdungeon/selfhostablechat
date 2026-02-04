import { WebPlugin } from '@capacitor/core';
import type { NodeServerPlugin } from './index';

export class NodeServerWeb extends WebPlugin implements NodeServerPlugin {
    async start(options: { port: number }): Promise<{ success: boolean; port: number }> {
        console.log('Web platform: Node.js server not available in browser');
        // In web/dev mode, assume the dev server is running
        return {
            success: true,
            port: options.port || 5173
        };
    }

    async stop(): Promise<{ success: boolean }> {
        console.log('Web platform: Node.js server not available in browser');
        return { success: true };
    }

    async getStatus(): Promise<{ running: boolean; port?: number }> {
        // In web mode, check if dev server is accessible
        return {
            running: true,
            port: 5173
        };
    }
}
