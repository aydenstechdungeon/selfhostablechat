# Capacitor Android Setup

This directory contains the configuration and utilities for building the Android app using Capacitor.

## Overview

The Android app bundles the Node.js server with the client, similar to how the Electron desktop app works. The server runs on port **3422** within the Android app.

## Port Configuration

- **Dev Server**: 5173 (Vite development server)
- **Docker**: 3420
- **Electron**: 3421
- **Capacitor/Android**: 3422

## Architecture

1. **Client**: SvelteKit app built to `build/client`
2. **Server**: Node.js server built to `build`
3. **Embedded Server**: The server is bundled into Android assets and started by MainActivity

## Files

- `server.ts` - TypeScript utilities for managing the embedded server
- `MainActivity.java` - Android activity that starts the Node.js server
- `../scripts/build-capacitor.js` - Build script that bundles server with the app
- `../capacitor.config.ts` - Capacitor configuration

## Building the Android App

### Prerequisites

- Android Studio installed
- Java JDK 17 or higher
- Node.js runtime for Android (automatically bundled)

### Build Steps

1. **Build and prepare the Android project:**
   ```bash
   bun run mobile
   # or
   bun run capacitor:build
   ```

   This will:
   - Build the SvelteKit app (client + server)
   - Copy server files to Android assets
   - Bundle node_modules
   - Sync Capacitor configuration

2. **Open in Android Studio:**
   ```bash
   bun run mobile:open
   # or
   bunx cap open android
   ```

3. **Build APK in Android Studio:**
   - Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
   - Or use Gradle: `./gradlew assembleDebug`

### Development

For development, you can:

1. Run the dev server: `bun dev`
2. Use Capacitor live reload:
   ```bash
   # Update capacitor.config.ts server.url to point to your dev server
   # Then sync
   bunx cap sync android
   ```

## How It Works

### Server Startup

1. When the Android app starts, `MainActivity.onCreate()` is called
2. It extracts the bundled server files from assets to internal storage
3. It starts a Node.js process running the server on port 3422
4. The Capacitor webview loads from `http://localhost:3422`

### Server Bundling

The build script:
1. Builds the SvelteKit app (both client and server)
2. Copies the entire `build` directory to `android/app/src/main/assets/server`
3. Copies necessary `node_modules` dependencies
4. Creates a `.env` file with the correct port and configuration
5. Syncs Capacitor to update the Android project

### Network Configuration

The app uses:
- `androidScheme: 'http'` - Allows http://localhost connections
- `cleartext: true` - Enables cleartext traffic for localhost
- Port 3422 is hardcoded in:
  - `MainActivity.java`
  - `capacitor.config.ts`
  - `server.ts`

## Troubleshooting

### Server Not Starting

Check Android logs:
```bash
adb logcat | grep SelfHostableChat
```

### Large APK Size

The APK is large because it bundles:
- Node.js modules
- The entire server build
- Client assets

To reduce size:
1. Use production-only dependencies in the bundling script
2. Remove unnecessary node_modules
3. Enable ProGuard/R8 in Android build config

### Connection Issues

Ensure:
1. The server port (3422) is not blocked
2. Cleartext traffic is allowed in AndroidManifest.xml
3. Network security config allows localhost

## Next Steps

- [ ] Optimize node_modules bundling (only include production deps)
- [ ] Add automatic Node.js binary bundling for Android
- [ ] Implement proper error handling and server health checks
- [ ] Add Capacitor plugins for native features (push notifications, etc.)
- [ ] Create iOS support using similar architecture

## Alternative: Using Node.js for Mobile

Consider using [nodejs-mobile](https://github.com/JaneaSystems/nodejs-mobile) for a more robust Node.js runtime on Android/iOS. This would provide better Node.js support and smaller app sizes.
