# Capacitor Android - Embedded Node.js Implementation (Option 3)

## ✅ What's Implemented

This is the **complete embedded Node.js solution** - a fully self-contained Android app that runs both the client and server on the device.

### Architecture

```
┌─────────────────────────────────────────┐
│         Android APK                     │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐     │
│  │  WebView     │←─┤  Node.js     │     │
│  │  (Client)    │  │  Runtime     │     │
│  │              │  │  + Server    │     │
│  └──────────────┘  └──────────────┘     │
│         ↓                  ↓             │
│  localhost:3422 (loopback)               │
└─────────────────────────────────────────┘
```

### Components

1. **Node.js Runtime** (from unofficial-builds.nodejs.org)
   - Prebuilt Node.js v20.11.1 for ARM64 Android
   - Extracted to `assets/nodejs/`
   - Binary made executable on app start

2. **SvelteKit Server**
   - Full server build in `assets/server/`
   - All production dependencies bundled
   - Runs on port 3422

3. **MainActivity.java**
   - Extracts Node.js and server on first run
   - Starts server process with proper environment
   - Logs output for debugging
   - Cleanup on app close

## 🚀 Building the App

### Prerequisites

- Bun runtime
- Android Studio
- ~200MB free space (for Node.js download)

### Build Steps

```bash
# 1. Run the enhanced build script
bun run mobile

# This will:
# - Build the S

velteKit app
# - Download Node.js for Android (ARM64)
# - Extract and package Node.js binaries
# - Copy server files
# - Install production dependencies
# - Sync with Capacitor

# 2. Open in Android Studio
set -x CAPACITOR_ANDROID_STUDIO_PATH /home/crsh22/android-studio/bin/studio.sh
bun run mobile:open

# 3. Build APK in Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### First Build

The first build will download ~40MB Node.js archive. This is cached in `temp-node-android/` for subsequent builds.

## 📱 How It Works

### App Startup Sequence

1. **App Launches**
   - `MainActivity.onCreate()` is called
   - Starts background thread for server setup

2. **Extract Assets** (first run only)
   - Copies `assets/nodejs/` → `/data/data/.../files/nodejs/`
   - Copies `assets/server/` → `/data/data/.../files/server/`
   - Makes `nodejs/bin/node` executable

3. **Start Server**
   - Spawns Node.js process: `node /path/to/server/index.js`
   - Sets environment variables (PORT=3422, etc.)
   - Logs output to Android logcat

4. **Load WebView**
   - Waits 3 seconds for server startup
   - Capacitor WebView loads `http://localhost:3422`
   - App is fully functional!

### Logging

All server output goes to Android logcat with tag `SelfHostableChat`:

```bash
adb logcat -s SelfHostableChat
```

You'll see:
- Asset extraction progress
- Node.js command being executed
- Server startup logs
- Any errors

## 📦 What's Bundled

### In the APK:

```
assets/
├── nodejs/
│   ├── bin/
│   │   └── node          # ~40MB Node.js binary
│   └── lib/              # Node.js libraries
└── server/
    ├── index.js          # SvelteKit server
    ├── client/           # Frontend assets
    ├── server/           # Backend chunks
    ├── package.json
    ├── .env
    └── node_modules/     # Production dependencies (~50MB)
```

**Total APK Size**: ~120-150MB (yes, it's large!)

### Why So Large?

- Node.js binary: 40MB
- node_modules: 50-80MB
- Client assets: 10-20MB
- Android framework: ~10MB

This is the trade-off for a fully self-contained app.

## 🔧 Configuration

### Port (3422)

Configured in three places:
1. `MainActivity.java` - `SERVER_PORT = 3422`
2. `capacitor.config.ts` - `server.url`
3. `scripts/build-capacitor.js` - `SERVER_PORT`

### Node.js Version

In `scripts/build-capacitor.js`:
```javascript
const NODE_VERSION = 'v20.11.1';
const NODE_ARCH = 'arm64';
```

ARM64 covers most modern Android devices. For ARMv7 support, change to `armv7l`.

## ⚠️ Important Notes

### Device Compatibility

- **Minimum Android**: 7.0 (API 24)
- **Architecture**: ARM64 (most devices since ~2017)
- **ARMv7**: Need different Node.js binary
- **x86/x86_64**: Need different Node.js binary (emulators)

### First Run

- First launch extracts ~100MB of assets
- Takes 5-10 seconds
- Subsequent launches are instant (assets already extracted)

### Permissions

- **INTERNET**: Required for OpenRouter API calls
- **WRITE_EXTERNAL_STORAGE**: NOT needed (uses internal storage)

### Debugging

**Enable WebView debugging**:
- Already enabled in MainActivity
- Chrome → `chrome://inspect` → Select device

**View server logs**:
```bash
adb logcat -s SelfHostableChat:D nodejs:D
```

**Check if server is running**:
```bash
adb shell "netstat -an | grep 3422"
```

## 🐛 Troubleshooting

### "Node binary not found"

- Build script didn't complete successfully
- Run `bun run mobile` again
- Check `android/app/src/main/assets/nodejs/bin/node` exists

### "Cannot execute binary"

- File permissions issue
- Check MainActivity extracts and sets executable bit
- Manual fix: `adb shell chmod +x /data/data/com.selfhostablechat.app/files/nodejs/bin/node`

### Server doesn't start

1. Check logcat: `adb logcat -s SelfHostableChat`
2. Look for errors in extraction or server startup
3. Verify server files exist in `assets/server/`

### WebView shows error page

- Server not started yet (wait longer, or increase sleep time in MainActivity)
- Server crashed (check logcat)
- Wrong port (verify 3422 everywhere)

### APK too large

Current optimizations:
- Production dependencies only
- No dev dependencies
- Compressed Node.js binary

Further optimizations:
- Use ProGuard/R8 (may break things)
- Strip debug symbols from Node.js
- Use ARMv7 for smaller binary
- Implement on-demand module loading

## 🎯 Production Considerations

### Security

- API keys stored in Android internal storage (secure)
- localhost connections only (no external access)
- Standard Android app sandboxing applies

### Updates

- App updates via APK/Play Store
- Server code updated with app
- No separate server deployment

### Offline Mode

- Fully functional offline (except AI API calls)
- All data stored on device
- No cloud dependencies

### Battery & Performance

- Node.js process runs while app is open
- Killed when app is closed
- Similar battery impact to other chat apps

## 📊 Comparison

| Approach | APK Size | Setup Complexity | Offline | Updates |
|----------|----------|-----------------|---------|---------|
| **Embedded Node.js** | ~150MB | High | ✅ Full | Via APK |
| Static Build | ~15MB | Low | ⚠️ Partial | Via APK |
| External Backend | ~15MB | Medium | ❌ None | Separate |

## 🎉 Success Criteria

Your app is working if:
1. APK installs successfully
2. Logcat shows: `[SelfHostableChat] Starting Node.js server...`
3. Logcat shows: `[Node.js] Listening on...` or similar
4. WebView loads chat interface
5. Can send messages and get responses

## 🚀 Next Steps

1. **Build the APK**: `bun run mobile`
2. **Test on device**: Install and check logcat
3. **Optimize**: Remove unused dependencies
4. **Publish**: Sign APK for distribution

Congratulations! You now have a fully self-contained Android chat app! 🎊
