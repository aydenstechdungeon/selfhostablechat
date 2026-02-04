import { registerPlugin } from '@capacitor/core';

export interface NodeServerPlugin {
    /**
     * Start the embedded Node.js server
     */
    start(options: { port: number }): Promise<{ success: boolean; port: number }>;

    /**
     * Stop the embedded Node.js server
     */
    stop(): Promise<{ success: boolean }>;

    /**
     * Get the server status
     */
    getStatus(): Promise<{ running: boolean; port?: number }>;
}

const NodeServer = registerPlugin<NodeServerPlugin>('NodeServer', {
    web: () => import('./web').then(m => new m.NodeServerWeb()),
});

export default NodeServer;
