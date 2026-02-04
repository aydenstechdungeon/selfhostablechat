# Troubleshooting: ERR_CONNECTION_REFUSED on localhost:3422

## Problem
When running the Android app, you see:
```
Webpage not available
The webpage at http://localhost:3422 could not be loaded because:
net::ERR_CONNECTION_REFUSED
```

## Root Cause
The Node.js server is not starting because either:
1. The `nodejs-mobile` dependency is missing from `build.gradle`
2. The app wasn't rebuilt after adding the dependency
3. The server files are not in the correct location

## Solution Steps

### 1. Verify Dependencies ✅
Check `android/app/build.gradle` includes:
```gradle
repositories {
    mavenCentral()
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    // ... other dependencies ...
    
    // nodejs-mobile for running Node.js server (like Electron)
    implementation 'com.janeasystems:nodejs-mobile:0.4.3'
}
```

**Status**: ✅ Fixed - dependency added back

### 2. Verify Server Files Exist ✅
Check that the server files are bundled:
```bash
ls android/app/src/main/nodejs-assets/nodejs-project/
```

Should show:
- `main.js` (entry point)
- `index.js` (SvelteKit server)
- `package.json`
- `client/` directory
- `server/` directory
- `node_modules/` directory

**Status**: ✅ Files exist

### 3. Sync Capacitor ✅
```bash
bunx cap sync android
```

**Status**: ✅ Just completed

### 4. Rebuild in Android Studio ⚠️ REQUIRED
You MUST rebuild the app for the changes to take effect:

1. Open Android Studio: `bun run mobile:open`
2. Wait for Gradle sync to complete
3. **Build → Clean Project**
4. **Build → Rebuild Project**
5. Run the app again

### 5. Check Android Logs
After rebuilding, if still seeing issues, check logs:

```bash
adb logcat | grep -E "SelfHostableChat|nodejs-mobile"
```

Look for:
- ✅ `Starting nodejs-mobile server on port 3422`
- ✅ `[nodejs-mobile] Starting SvelteKit server on port 3422...`
- ✅ `Listening on 0.0.0.0:3422`

If you see errors, they'll indicate the problem.

## Why This Happened

You (or the build system) removed the `nodejs-mobile` dependency from `build.gradle`. Without it:
- The `RNNodeJsMobileModule` class doesn't exist
- `MainActivity.java` fails to compile or crashes at runtime
- The Node.js server never starts
- The WebView tries to connect to localhost:3422 but nothing is listening
- Result: ERR_CONNECTION_REFUSED

## Prevention

The `nodejs-mobile` dependency is **critical** - don't remove it! It's like removing Node.js from your system when running Electron - the app simply can't work without it.

## Quick Fix Summary

```bash
# 1. Dependency is now fixed in build.gradle ✅
# 2. Capacitor synced ✅
# 3. Now you need to:

bun run mobile:open
# In Android Studio:
# - Build → Clean Project
# - Build → Rebuild Project  
# - Run app
```

## Expected Flow (When Working)

1. App launches → `MainActivity.onCreate()`
2. `startNodeJsServer()` calls `RNNodeJsMobileModule.start(this, "main.js")`
3. nodejs-mobile runtime loads and executes `main.js`
4. `main.js` imports `index.js` (SvelteKit server)
5. Server starts listening on `0.0.0.0:3422`
6. WebView loads `http://localhost:3422`
7. ✅ App shows UI

## Still Not Working?

If after rebuilding it still doesn't work:

1. **Check Gradle sync**:
   - Look for "Gradle sync failed" in Android Studio
   - Check the "Build" output tab for errors

2. **Check logcat for errors**:
   ```bash
   # Clear logs and run app
   adb logcat -c
   adb logcat | grep -i error
   ```

3. **Verify build**:
   Check the APK actually includes nodejs-mobile:
   ```bash
   # After building
   unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep nodejs
   ```
   Should show native libraries for nodejs-mobile.

4. **Complete rebuild**:
   ```bash
   # Clean everything
   rm -rf android/app/build
   rm -rf android/app/.gradle
   
   # Rebuild
   bun run mobile:open
   # Build → Clean Project → Rebuild Project
   ```

## Reference

The working configuration is documented in:
- `CAPACITOR_IMPLEMENTATION.md` - Full architecture details
- `ANDROID_ELECTRON_BUNDLING.md` - Electron comparison
- `BUILD_REFERENCE.md` - Quick reference
