import { app, BrowserWindow, Menu } from 'electron';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_PORT = 3421;
let serverProcess = null;
let mainWindow = null;

// Helper to load .env file manually since we manipulate process.env for the spawned server
function loadEnv() {
    const pathsToCheck = [];

    // 1. User data directory (e.g. ~/.config/AppName/.env) - Best for user config
    try {
        pathsToCheck.push(path.join(app.getPath('userData'), '.env'));
    } catch (e) {
        // app.getPath might fail if somehow called too early, but usually works
    }

    // 2. Resources directory (packaged app) or Root (dev)
    if (app.isPackaged) {
        pathsToCheck.push(path.join(process.resourcesPath, '.env'));
    } else {
        pathsToCheck.push(path.join(__dirname, '../.env'));
    }

    for (const envPath of pathsToCheck) {
        try {
            if (fs.existsSync(envPath)) {
                console.log('Loading .env from:', envPath);
                const content = fs.readFileSync(envPath, 'utf8');
                const lines = content.split('\n');
                for (const line of lines) {
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        const key = match[1];
                        let value = match[2] || '';
                        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                            value = value.replace(/\\n/gm, '\n');
                        }
                        value = value.replace(/(^['"]|['"]$)/g, '').trim();
                        if (!process.env[key]) {
                            process.env[key] = value;
                        }
                    }
                }
            } else {
                console.log('.env file not found at:', envPath);
            }
        } catch (e) {
            console.error('Failed to load .env from', envPath, e);
        }
    }
}

// Generate encryption key if missing to prevent crash
function ensureEncryptionKey() {
    if (!process.env.ENCRYPTION_KEY) {
        console.warn('ENCRYPTION_KEY not found in environment. Generating a temporary key for this session.');
        process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
    }
}

// Load env and ensure key before anything else
loadEnv();
ensureEncryptionKey();

function createWindow() {
    // Remove the menu bar but keep context menu for copy/paste
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0f1419', // Match base-darkest
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        icon: path.join(__dirname, '../static/icon.ico'),
        title: 'SelfHostableChat',
        show: false // Don't show until ready or loading starts
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });



    // Enable right-click context menu for copy/paste
    mainWindow.webContents.on('context-menu', (event, params) => {
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
            { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
            { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
            { type: 'separator' },
            { label: 'Select All', role: 'selectAll' }
        ]);
        contextMenu.popup();
    });

    // Retry loading until server is ready
    const loadWithRetry = async () => {
        const maxRetries = 30;
        let retries = 0;

        while (retries < maxRetries && mainWindow) {
            try {
                // Use 127.0.0.1 to match server binding
                await mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
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
    return new Promise(async (resolve, reject) => {
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

        // Setup logging
        const logFile = path.join(app.getPath('userData'), 'server.log');
        const logStream = fs.createWriteStream(logFile, { flags: 'a' });

        console.log('Starting bundled server from:', serverScript);
        console.log('Server logs redirected to:', logFile);

        // Log initial startup info
        logStream.write(`\n\n--- App Startup at ${new Date().toISOString()} ---\n`);
        logStream.write(`Server Script: ${serverScript}\n`);
        logStream.write(`Resources Path: ${process.resourcesPath}\n`);

        // Set environment variables for the server
        const env = {
            ...process.env,
            PORT: SERVER_PORT.toString(),
            OPENROUTER_API_URL: 'https://openrouter.ai/api/v1',
            ORIGIN: `http://127.0.0.1:${SERVER_PORT}`,
            HOST: '127.0.0.1',
            NODE_ENV: 'production',
            ELECTRON_RUN_AS_NODE: '1'
        };

        // Use fork instead of spawn for better compatibility in packaged apps
        // fork ensures the child process is launched using the same executable (Electron/Node)
        // and handles IPC communication properly.
        const { fork } = await import('child_process');

        serverProcess = fork(serverScript, [], {
            env,
            cwd: serverPath,
            // Pipe stdout/stderr to log file, and ensure IPC channel is open
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
        });

        if (serverProcess.stdout) {
            serverProcess.stdout.pipe(logStream);
        }
        if (serverProcess.stderr) {
            serverProcess.stderr.pipe(logStream);
        }

        serverProcess.on('error', (err) => {
            console.error('Failed to start server:', err);
            logStream.write(`Failed to start server: ${err.message}\n`);
            reject(err);
        });

        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Server exited with code ${code}`);
                logStream.write(`Server exited with code ${code}\n`);
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
        // Don't quit immediately, allow window to show error connection screen
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
