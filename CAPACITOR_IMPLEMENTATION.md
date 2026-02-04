# Capacitor Android Implementation

## Overview

This document details the Capacitor implementation for building an Android app that bundles the Node.js backend server with the SvelteKit frontend, **exactly like the Electron desktop implementation**.

## Architecture Comparison: Electron vs Capacitor

Both implementations follow the **same bundling pattern**:

| Aspect | Electron (Desktop) | Capacitor (Android) |
|--------|-------------------|---------------------|
| **Runtime** | Native Node.js | nodejs-mobile |
| **Server Location** | `process.resourcesPath/server` | `nodejs-assets/nodejs-project/` |
| **Startup API** | `spawn('node', ['index.js'])` | `RNNodeJsMobileModule.start('main.js')` |
| **Port** | 3421 | 3422 |
| **Client Build** | `build/client` | `build/client` |
| **Server Build** | `build/` → `extraResources/server` | `build/` → `nodejs-project/` |
| **Bundle Size** | ~150MB | ~100MB |

**Key Insight**: Both bundle the server with the client for a fully self-contained application. Capacitor uses `nodejs-mobile` instead of native Node.js, but the architecture is identical.

## Port Configuration

The application uses different ports for different environments:

- **Dev Server**: `5173` (Vite development server)
- **Docker**: `3420`
- **Electron Desktop**: `3421`
- **Capacitor Android**: `3422`

## Key Files

### Configuration
- `capacitor.config.ts` - Capacitor configuration, points to `localhost:3422`
- `android/app/build.gradle` - Includes nodejs-mobile dependency

### Build Scripts
- `scripts/build-capacitor.js` - Bundles server with app (mirrors Electron approach)
- Package.json scripts:
  - `mobile` - Build the Android app
  - `mobile:open` - Open Android Studio

### Android Code
- `android/app/src/main/java/com/selfhostablechat/app/MainActivity.java` - Starts nodejs-mobile server
- `android/app/src/main/nodejs-assets/nodejs-project/` - Bundled server files (created during build)

## Build Process

### 1. Build the Android App

```bash
bun run mobile
```

This script (mirroring Electron's build):
1. Builds SvelteKit app (`build/` directory)
2. Copies `build/` to `nodejs-assets/nodejs-project/` (like Electron's `extraResources/server`)
3. Creates `package.json` with production dependencies
4. Installs production dependencies
5. Creates `main.js` entry point (like Electron's server wrapper)
6. Creates environment configuration
7. Syncs Capacitor

### 2. Open in Android Studio

```bash
bun run mobile:open
```

### 3. Build APK

In Android Studio:
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- Or use Gradle: `./gradlew assembleDebug`

## How It Works

### Server Startup Flow (Compared to Electron)

**Electron Flow:**
1. App launches → `main.js` executes
2. `startServer()` calls `spawn('node', ['index.js'])`
3. SvelteKit server starts on port 3421
4. BrowserWindow loads `http://localhost:3421`

**Capacitor Flow:**
1. App launches → `MainActivity.onCreate()`
2. `startNodeJsServer()` calls `RNNodeJsMobileModule.start('main.js')`
3. nodejs-mobile executes `main.js` which imports `index.js`
4. SvelteKit server starts on port 3422
5. Capacitor WebView loads `http://localhost:3422`

### File Structure in APK

```
android/app/src/main/
└── nodejs-assets/
    └── nodejs-project/        # Bundled server (like Electron's extraResources/server)
        ├── main.js            # Entry point (sets env vars, imports index.js)
        ├── index.js           # SvelteKit server
        ├── package.json       # Production dependencies
        ├── .env               # Environment config
        ├── client/            # Frontend build
        ├── server/            # Backend chunks
        └── node_modules/      # Production deps
```

Compare with Electron:
```
dist-electron/
├── main.js                    # Electron entry point
└── resources/
    └── server/                # Bundled server
        ├── index.js           # SvelteKit server
        ├── package.json
        ├── client/
        ├── server/
        └── node_modules/
```

## Development Workflow

### Production Build

For production APK with bundled server (recommended):

1. Build: `bun run mobile`
2. Open: `bun run mobile:open`
3. Build APK in Android Studio

This gives you a **self-contained APK** just like Electron's AppImage - no external server needed!

## Implementation Status

### ✅ Completed

- [x] nodejs-mobile integration (Electron-equivalent runtime)
- [x] Simplified build script (mirrors Electron's extraResources pattern)
- [x] MainActivity with nodejs-mobile startup (mirrors Electron's spawn)
- [x] Port configuration (3422)
- [x] Environment configuration
- [x] Package.json scripts
- [x] Documentation updated

### ⚠️ Pending Testing

- [ ] Test on actual Android device
- [ ] Verify server starts correctly
- [ ] Test server health checks
- [ ] Performance testing
- [ ] Memory usage monitoring

## nodejs-mobile Integration

The app uses `com.janeasystems:nodejs-mobile:0.4.3` to run Node.js on Android.

### Dependency (Already Added)

In `android/app/build.gradle`:
```gradle
dependencies {
    // nodejs-mobile for running Node.js server (like Electron)
    implementation 'com.janeasystems:nodejs-mobile:0.4.3'
}
```

### Usage in MainActivity

```java
// Start nodejs-mobile (similar to Electron's spawn)
RNNodeJsMobileModule.start(this, "main.js");
```

This is the Android equivalent of Electron's:
```javascript
serverProcess = spawn('node', [serverScript], { env, cwd: serverPath });
```

## Troubleshooting

### Server Not Starting

Check Android logs:
```bash
adb logcat | grep SelfHostableChat
adb logcat | grep nodejs-mobile
```

Look for:
- "Starting nodejs-mobile server on port 3422"
- "[nodejs-mobile] Starting SvelteKit server..."

### Build Failures

1. Clean nodejs-project: `rm -rf android/app/src/main/nodejs-assets/nodejs-project`
2. Rebuild SvelteKit: `bun run build`
3. Rebuild Capacitor: `bun run mobile`

### Connection Issues

1. Verify port 3422 in:
   - `capacitor.config.ts` (`server.url: 'http://localhost:3422'`)
   - `MainActivity.java` (`SERVER_PORT = 3422`)
   - `scripts/build-capacitor.js` (`SERVER_PORT = 3422`)
2. Check cleartext traffic is allowed (already configured)

### Large APK Size

The APK includes:
- nodejs-mobile runtime (~30MB)
- All node_modules dependencies
- Server build
- Client build

Current optimizations:
- Production-only dependencies
- .gz files removed (prevents duplicate resources)

Future optimizations:
- Tree-shake unused modules
- Enable ProGuard/R8 for release builds
- Code splitting

## Comparison with Electron

| Feature | Electron (Port 3421) | Capacitor (Port 3422) |
|---------|---------------------|----------------------|
| Runtime | Node.js (desktop) | nodejs-mobile (Android) |
| Server Location | `process.resourcesPath/server` | `nodejs-assets/nodejs-project/` |
| Startup Command | `spawn('node', serverScript)` | `RNNodeJsMobileModule.start('main.js')` |
| Client Build | Same (`build/client`) | Same (`build/client`) |
| Server Build | `build/` → `extraResources/server` | `build/` → `nodejs-project/` |
| Distribution | AppImage, NSIS, DMG | APK, AAB |
| Bundle Size | ~150MB | ~100MB |
| Self-Contained | ✅ Yes | ✅ Yes |

**Both implementations provide a fully self-contained application with no external dependencies!**

## References

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [nodejs-mobile](https://github.com/JaneaSystems/nodejs-mobile)
- [SvelteKit Adapter Node](https://kit.svelte.dev/docs/adapter-node)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)

