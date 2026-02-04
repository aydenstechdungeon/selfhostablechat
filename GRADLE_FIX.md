# Gradle Build Fixed - Repository Configuration

## Issues Fixed

### 1. `android/app/build.gradle` ✅
```
Build was configured to prefer settings repositories over project repositories 
but repository 'MavenRepo' was added by build file 'app/build.gradle'
```

### 2. `android/capacitor-cordova-android-plugins/build.gradle` ✅
```
Build was configured to prefer settings repositories over project repositories 
but repository 'Google' was added by build file 'capacitor-cordova-android-plugins/build.gradle'
```

## Root Cause
Modern Gradle (8.x+) centralizes repository management in `settings.gradle` to avoid conflicts and ensure consistency. Adding repositories in individual module `build.gradle` files violates this rule.

## Solution ✅

**Removed project-level `repositories` blocks from:**
1. `android/app/build.gradle`
2. `android/capacitor-cordova-android-plugins/build.gradle`

**Note:** `buildscript` repositories are still allowed and remain in place for build tools.

## Repository Configuration

**All repositories are centrally managed** in `android/settings.gradle`:
```gradle
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()                    // ✅ Android SDK & libraries
        mavenCentral()              // ✅ Standard Java/Kotlin libraries
        jcenter()                   // Legacy support
        maven {
            url 'https://janeasystems.com/maven'  // ✅ For nodejs-mobile
        }
        flatDir{
            dirs 'capacitor-cordova-android-plugins/src/main/libs', 'app/libs'
        }
    }
}
```

This configuration provides:
- ✅ Google repositories (Android SDK, AndroidX, etc.)
- ✅ Maven Central (most dependencies including nodejs-mobile)
- ✅ Custom maven for nodejs-mobile
- ✅ Local flatDir for any local .jar/.aar files

## Status
✅ `android/app/build.gradle` fixed
✅ `android/capacitor-cordova-android-plugins/build.gradle` fixed  
✅ `nodejs-mobile` dependency still present
✅ All required repositories in `settings.gradle`

## Next Steps

**Gradle should now sync successfully!**

1. **In Android Studio**:
   - Wait for "Gradle sync" to complete
   - Check for success message
   
2. **Clean and rebuild**:
   - Build → Clean Project
   - Build → Rebuild Project
   
3. **Run the app**:
   - The server should start on `localhost:3422`
   - WebView should load successfully
   - No more ERR_CONNECTION_REFUSED

## Verification

Check that Gradle sync succeeded:
- Look for "Gradle sync finished" in Android Studio
- No red errors in the build output
- Project structure loads correctly

If successful, the app will:
1. Start MainActivity
2. Launch nodejs-mobile with `main.js`
3. Start SvelteKit server on port 3422
4. Load WebView from localhost:3422
5. Show the app UI

## Troubleshooting

If you still see repository errors:
1. **File → Invalidate Caches → Invalidate and Restart**
2. **Delete** `.gradle` folders:
   ```bash
   rm -rf android/.gradle
   rm -rf android/app/.gradle
   ```
3. **Rebuild** in Android Studio

## Why This Rule Exists

Centralizing repositories in `settings.gradle`:
- ✅ Prevents conflicts between modules
- ✅ Ensures consistent dependency resolution
- ✅ Makes it easier to manage corporate proxies/mirrors
- ✅ Improves build reproducibility
- ✅ Simplifies dependency troubleshooting
