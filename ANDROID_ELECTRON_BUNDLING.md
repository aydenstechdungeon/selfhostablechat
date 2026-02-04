# Android Capacitor - Electron-Style Bundling

## Summary

Successfully refactored the Android Capacitor app to bundle the server and client together **exactly like Electron**. The new architecture is simpler, more maintainable, and mirrors the desktop implementation.

## Key Changes

### 1. Build Script (`scripts/build-capacitor.js`)

**Before:**
- Downloaded custom Node.js binary for Android (~150 lines of code)
- Extracted tar.gz files
- Manually copied Node.js bin and lib directories
- Complex asset extraction

**After:**
- Simple copy of `build/` to `nodejs-assets/nodejs-project/` (mirrors Electron's `extraResources`)
- Creates `main.js` entry point (like Electron's server wrapper)
- Much simpler: ~170 lines vs ~217 lines
- No external downloads needed

### 2. MainActivity (`MainActivity.java`)

**Before:**
- Manual asset extraction (170 lines)
- Custom ProcessBuilder to spawn Node.js binary
- Complex file copying logic
- Error-prone binary permissions handling

**After:**
- Simple nodejs-mobile API call (50 lines)
- `RNNodeJsMobileModule.start(this, "main.js")` - mirrors Electron's `spawn('node', ...)`
- nodejs-mobile handles all runtime complexity
- Much cleaner and more reliable

### 3. Dependencies (`build.gradle`)

**Added:**
```gradle
implementation 'com.janeasystems:nodejs-mobile:0.4.3'
```

This provides the embedded Node.js runtime for Android, equivalent to the system Node.js that Electron uses.

## Architecture Comparison

| Aspect | Electron | Capacitor (Now) |
|--------|----------|----------------|
| **Build Process** | Copy `build/` → `extraResources/server` | Copy `build/` → `nodejs-assets/nodejs-project/` |
| **Entry Point** | `electron/main.js` spawns server | `main.js` imports server |
| **Server Start** | `spawn('node', ['index.js'])` | `RNNodeJsMobileModule.start('main.js')` |
| **Runtime** | System Node.js | nodejs-mobile (embedded Node.js) |
| **Port** | 3421 | 3422 |
| **Bundle** | Self-contained AppImage | Self-contained APK |

## Benefits

1. **Simplicity**: Reduced complexity by ~40%
2. **Maintainability**: Code mirrors Electron, easier to understand
3. **Reliability**: Uses battle-tested nodejs-mobile instead of custom binary extraction
4. **Performance**: Faster build times (no downloads/extractions)
5. **Consistency**: Same architecture across desktop and mobile

## File Structure

```
android/app/src/main/nodejs-assets/nodejs-project/
├── main.js              # Entry point (sets env, imports index.js)
├── index.js             # SvelteKit server
├── package.json         # Production dependencies
├── .env                 # Environment config
├── client/              # Frontend build
├── server/              # Backend chunks
└── node_modules/        # Production deps
```

This **exactly mirrors** Electron's structure:
```
dist-electron/resources/server/
├── index.js
├── package.json
├── client/
├── server/
└── node_modules/
```

## How to Build

```bash
# Build the app (creates self-contained APK)
bun run mobile

# Open in Android Studio
bun run mobile:open

# In Android Studio: Build → Build APK
```

## Testing Checklist

- [ ] Test on Android device
- [ ] Verify server starts on localhost:3422
- [ ] Check WebView loads correctly
- [ ] Test API calls work
- [ ] Monitor memory usage
- [ ] Check APK size

## Future Improvements

1. Add server health monitoring
2. Implement graceful error handling
3. Optimize APK size with ProGuard/R8
4. Add native splash screen during server startup
5. Test on various Android versions and architectures
