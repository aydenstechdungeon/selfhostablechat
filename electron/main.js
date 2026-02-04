import { app, BrowserWindow, Menu } from 'electron';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_PORT = 3421;
let serverProcess = null;
let mainWindow = null;

function createWindow() {
    // Remove the menu bar
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        icon: path.join(__dirname, '../static/icon.ico'),
        title: 'SelfHostableChat'
    });

    // Retry loading until server is ready
    const loadWithRetry = async () => {
        const maxRetries = 30;
        let retries = 0;

        while (retries < maxRetries && mainWindow) {
            try {
                await mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
                console.log('Successfully connected to server');
                break;
            } catch (err) {
                retries++;
                if (retries < maxRetries) {
                    console.log(`Waiting for server... (${retries}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.error('Failed to connect to server after max retries');
                }
            }
        }
    };

    loadWithRetry();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
            // In development, assume the server is running separately
            console.log('Development mode: assuming server is running on port', SERVER_PORT);
            setTimeout(resolve, 1000);
            return;
        }

        // In production, start the bundled server
        const serverPath = path.join(process.resourcesPath, 'server');
        const serverScript = path.join(serverPath, 'index.js');

        console.log('Starting bundled server from:', serverScript);

        // Set environment variables for the server
        const env = {
            ...process.env,
            PORT: SERVER_PORT.toString(),
            OPENROUTER_API_URL: 'https://openrouter.ai/api/v1',
            ORIGIN: `http://localhost:${SERVER_PORT}`,
            HOST: '127.0.0.1',
            NODE_ENV: 'production'
        };

        serverProcess = spawn('node', [serverScript], {
            env,
            cwd: serverPath,
            stdio: 'inherit'
        });

        serverProcess.on('error', (err) => {
            console.error('Failed to start server:', err);
            reject(err);
        });

        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Server exited with code ${code}`);
            }
        });

        // Wait a bit for the server to start
        setTimeout(() => {
            console.log('Server should be ready');
            resolve();
        }, 2000);
    });
}

function stopServer() {
    if (serverProcess) {
        console.log('Stopping server process...');
        serverProcess.kill();
        serverProcess = null;
    }
}

app.whenReady().then(() => {
    // Start server and window simultaneously
    startServer().catch(err => {
        console.error('Failed to start server:', err);
        app.quit();
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopServer();
});
