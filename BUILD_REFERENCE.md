# Quick Reference: Building Self-Contained Apps

## Overview

Both Electron (desktop) and Capacitor (Android) use the **same bundling approach**: package the SvelteKit server and client together into a single distributable file.

## Desktop (Electron)

### Build Command
```bash
bun run desktop:build
```

### What It Does
1. Builds SvelteKit app → `build/`
2. Copies `build/` → `dist-electron/resources/server/`
3. Creates AppImage/NSIS/DMG with Electron runtime

### Output
- **Linux**: AppImage (~150MB)
- **Windows**: NSIS installer, Portable exe
- **macOS**: DMG

### Server Startup
```javascript
// electron/main.js
const serverProcess = spawn('node', ['index.js'], {
  env: { PORT: '3421', ... },
  cwd: serverPath
});
```

### User Experience
- Downloads AppImage
- Runs it
- Server starts automatically on localhost:3421
- BrowserWindow opens → app runs

## Mobile (Android via Capacitor)

### Build Command
```bash
bun run mobile
bun run mobile:open  # Opens Android Studio
# Build APK in Android Studio
```

### What It Does
1. Builds SvelteKit app → `build/`
2. Copies `build/` → `android/app/src/main/nodejs-assets/nodejs-project/`
3. Bundles with nodejs-mobile runtime
4. Creates APK in Android Studio

### Output
- **Android**: APK (~100MB)

### Server Startup
```java
// MainActivity.java
RNNodeJsMobileModule.start(this, "main.js");
// main.js imports index.js and starts server
```

### User Experience
- Installs APK
- Opens app
- Server starts automatically on localhost:3422
- WebView opens → app runs

## Side-by-Side Comparison

| Feature | Electron | Capacitor |
|---------|----------|-----------|
| **Command** | `bun run desktop:build` | `bun run mobile` |
| **Server Location** | `resources/server/` | `nodejs-assets/nodejs-project/` |
| **Runtime** | System Node.js | nodejs-mobile |
| **Port** | 3421 | 3422 |
| **Output** | AppImage/NSIS/DMG | APK/AAB |
| **Size** | ~150MB | ~100MB |
| **Self-Contained** | ✅ | ✅ |
| **No External Server** | ✅ | ✅ |

## Common Architecture

Both implementations:
1. Bundle the complete server code
2. Bundle the complete client code
3. Include all production dependencies
4. Start server automatically on launch
5. Load UI from localhost
6. Require no external services

## Port Reference

- `5173` - Vite dev server (development)
- `3420` - Docker deployment
- `3421` - Electron desktop app
- `3422` - Capacitor Android app

## Development Workflow

### Desktop Development
```bash
bun dev              # Start dev server
bun run desktop      # Run Electron in dev mode
```

### Mobile Development
```bash
bun dev              # Start dev server
# Update capacitor.config.ts with your IP
bun run mobile:open  # Open in Android Studio, run on device
```

### Production Builds
```bash
# Desktop
bun run desktop:build           # Builds for all platforms
bun run electron:build:linux    # Linux only
bun run electron:build:win      # Windows only

# Mobile
bun run mobile                  # Prepare Android build
bun run mobile:open             # Open Android Studio
# Then: Build → Build APK(s)
```

## Key Files

### Electron
- `electron/main.js` - Entry point, spawns server
- `electron-builder.json` - Build configuration
- `build/` → `dist-electron/resources/server/`

### Capacitor
- `android/app/src/main/java/.../MainActivity.java` - Entry point, starts nodejs-mobile
- `android/app/build.gradle` - Dependencies (includes nodejs-mobile)
- `build/` → `android/app/src/main/nodejs-assets/nodejs-project/`
- `scripts/build-capacitor.js` - Build script

## Testing

### Desktop
```bash
bun run desktop:build
./dist-electron/SelfHostableChat*.AppImage  # Linux
```

### Mobile
```bash
bun run mobile
bun run mobile:open
# Install APK on device via Android Studio
```

## Distribution

### Desktop
- **Linux**: Distribute AppImage file
- **Windows**: Distribute NSIS installer or portable .exe
- **macOS**: Distribute DMG file

### Mobile
- **APK**: Direct distribution (sideloading)
- **AAB**: Google Play Store (need to create AAB instead of APK)

## Summary

Both desktop and mobile apps are **self-contained** - users download one file, run it, and the app works without any external setup. The server runs in the background automatically, and the UI connects to localhost.
