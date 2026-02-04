#!/usr/bin/env node

/**
 * Build script for Capacitor Android with nodejs-mobile
 * Mirrors the Electron build approach - bundle server + client together
 */

import { spawn } from 'child_process';
import { mkdir, cp, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const SERVER_PORT = 3422;

async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`▶️  ${command} ${args.join(' ')}`);
        const proc = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

async function main() {
    console.log('🚀 Building Capacitor Android app (Electron-style bundling)...\n');

    // Step 1: Build SvelteKit app (client + server)
    console.log('📦 Step 1: Building SvelteKit app...');
    await runCommand('bun', ['run', 'build']);

    const buildDir = join(process.cwd(), 'build');
    if (!existsSync(buildDir)) {
        throw new Error('Build directory not found. Build failed?');
    }

    // Step 2: Prepare nodejs-mobile project directory
    console.log('\n📂 Step 2: Preparing nodejs-mobile project...');
    const nodejsProjectDir = join(
        process.cwd(),
        'android',
        'app',
        'src',
        'main',
        'nodejs-assets',
        'nodejs-project'
    );

    // Clean existing nodejs-project if it exists
    if (existsSync(nodejsProjectDir)) {
        console.log('🗑️  Cleaning existing nodejs-project...');
        await rm(nodejsProjectDir, { recursive: true, force: true });
    }

    await mkdir(nodejsProjectDir, { recursive: true });

    // Step 3: Copy server build (just like Electron's extraResources)
    console.log('\n📋 Step 3: Copying server build...');
    await cp(buildDir, nodejsProjectDir, { recursive: true });

    // Remove .gz files to prevent Android duplicate resource errors
    console.log('🗑️  Removing precompressed .gz files...');
    await runCommand('find', [nodejsProjectDir, '-name', '*.gz', '-type', 'f', '-delete']);

    // Step 4: Create minimal package.json (production dependencies only)
    console.log('\n📦 Step 4: Creating package.json...');
    const rootPackageJson = JSON.parse(
        await readFile(join(process.cwd(), 'package.json'), 'utf-8')
    );

    const minimalPackageJson = {
        name: rootPackageJson.name,
        version: rootPackageJson.version,
        type: 'module',
        main: 'main.js',
        dependencies: rootPackageJson.dependencies
    };

    await writeFile(
        join(nodejsProjectDir, 'package.json'),
        JSON.stringify(minimalPackageJson, null, 2)
    );

    // Step 5: Install production dependencies
    console.log('\n📦 Step 5: Installing production dependencies...');
    await runCommand('bun', ['install', '--production', '--no-save'], {
        cwd: nodejsProjectDir
    });

    // Step 6: Create main.js entry point (like Electron's spawn wrapper)
    console.log('\n🔧 Step 6: Creating main.js entry point...');
    const mainJs = `/**
 * nodejs-mobile entry point
 * Sets up environment and starts the SvelteKit server
 * (Like Electron's spawn wrapper but runs directly in nodejs-mobile)
 */

// Set environment variables (like Electron does)
process.env.PORT = '${SERVER_PORT}';
process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
process.env.ORIGIN = 'http://localhost:${SERVER_PORT}';
process.env.HOST = '127.0.0.1';
process.env.NODE_ENV = 'production';

console.log('[nodejs-mobile] Starting SvelteKit server on port ${SERVER_PORT}...');
console.log('[nodejs-mobile] Working directory:', process.cwd());

// Import and start the server (index.js is the built SvelteKit server)
import('./index.js').catch((err) => {
    console.error('[nodejs-mobile] Failed to start server:', err);
    process.exit(1);
});
`;

    await writeFile(join(nodejsProjectDir, 'main.js'), mainJs);

    // Step 7: Create .env file (backup environment config)
    console.log('\n🔧 Step 7: Creating .env file...');
    const envConfig = `PORT=${SERVER_PORT}
OPENROUTER_API_URL=https://openrouter.ai/api/v1
ORIGIN=http://localhost:${SERVER_PORT}
HOST=127.0.0.1
NODE_ENV=production
`;
    await writeFile(join(nodejsProjectDir, '.env'), envConfig);

    // Step 8: Sync Capacitor
    console.log('\n🔄 Step 8: Syncing Capacitor...');
    await runCommand('bunx', ['cap', 'sync', 'android']);

    console.log('\n✅ Build complete!\n');
    console.log('📱 Next steps:');
    console.log('   1. bun run mobile:open');
    console.log('   2. Build APK in Android Studio\n');
    console.log('📊 Bundled components (Electron-style):');
    console.log(`   - Server (nodejs-mobile): port ${SERVER_PORT}`);
    console.log(`   - Client: SvelteKit frontend`);
    console.log(`   - Location: android/app/src/main/nodejs-assets/nodejs-project/\n`);
    console.log('💡 Architecture:');
    console.log('   - Similar to Electron\'s extraResources');
    console.log('   - nodejs-mobile runs the server');
    console.log('   - WebView loads from localhost:3422\n');
}

main().catch((err) => {
    console.error('\n❌ Build failed:', err.message);
    console.error(err.stack);
    process.exit(1);
});
