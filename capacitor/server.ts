import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

const SERVER_PORT = 3422;
let serverUrl = `http://localhost:${SERVER_PORT}`;

export async function startEmbeddedServer() {
    if (!Capacitor.isNativePlatform()) {
        // In browser/dev mode, use dev server
        console.log('Running in browser mode, using dev server');
        return 'http://localhost:5173';
    }

    // For Android, we'll bundle the server as native assets
    console.log('Starting embedded server on port', SERVER_PORT);

    // The server will be started by the native Android code
    // We just need to wait a bit for it to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    return serverUrl;
}

export function getServerUrl() {
    return serverUrl;
}
