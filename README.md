# VibeUp Mobile App

A React + Vite + Capacitor mobile app for VibeUp - works perfectly offline and in the browser!

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the dev server:
```bash
npm run dev
```

The app will open automatically at http://localhost:3000

## Building for Android

### Prerequisites
- Node.js 18+ installed
- Android Studio installed
- Android SDK configured
- Java JDK 11+ installed

### Development Build

1. Build the web app:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npm run android:sync
```

3. Open in Android Studio:
```bash
npm run android:open
```

Or run directly on device/emulator:
```bash
cd android
./gradlew installDebug
```

### Release Build (AAB for Play Store)

**IMPORTANT**: Before building for release, ensure:
- `versionCode` and `versionName` are updated in `android/app/build.gradle`
- Proper signing configuration is set up (see Android signing below)

1. Build the web app:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npm run android:sync
```

3. Build release AAB:
```bash
npm run android:release
```

The AAB file will be located at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### All-in-One Commands

```bash
# Build and sync in one command
npm run android:build

# Open Android Studio
npm run android:open
```

## Android Signing Configuration

For Play Store release, you need to set up proper signing:

1. Create a keystore (one-time):
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore vibeup-release-key.keystore -alias vibeup-key -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `android/keystore.properties`:
```properties
storeFile=../vibeup-release-key.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=vibeup-key
keyPassword=YOUR_KEY_PASSWORD
```

3. Update `android/app/build.gradle` to use signing config (see release buildType)

## Features

- ✅ Discover feed with profile cards
- ✅ Matches screen
- ✅ Messages screen  
- ✅ Profile screen
- ✅ Local storage (localStorage with offline fallback)
- ✅ Works offline
- ✅ No backend required
- ✅ Production-safe logging
- ✅ Error boundaries and global error handling
- ✅ Optimized performance with lazy loading

## Firestore Production Setup

This project includes production Firestore policy files:

- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`

### One-time project binding

```bash
npx firebase-tools login
npx firebase-tools use --add
```

Select your Firebase project and save the alias (this creates `.firebaserc` locally).

### Deploy Firestore rules and indexes

```bash
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only firestore:indexes
```

### Verify required index

The app uses a collection-group query on `swipes` (`targetId` + `type`), and the required composite index is already defined in `firestore.indexes.json`.

## Sign-Off Checklist

Before launch, run through [SIGN_OFF_CHECKLIST.md](./SIGN_OFF_CHECKLIST.md). Covers build, core flows, deploy, and Stripe webhook setup.

## Release Checklist

### Pre-Release

- [ ] Update `versionCode` in `android/app/build.gradle` (increment for each release)
- [ ] Update `versionName` in `android/app/build.gradle` (e.g., "1.0.1")
- [ ] Verify app name is "VibeUp" in `capacitor.config.ts` and `strings.xml`
- [ ] Verify package ID is "com.perezcode.vibeup" in all configs
- [ ] Test app runs in release mode without crashes
- [ ] Verify offline functionality works (disable network and test)
- [ ] Check that no sensitive data is logged (production builds should have no console.log)

### Build Steps

1. **Clean install dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **Build web assets:**
```bash
npm run build
```

3. **Sync Capacitor:**
```bash
npm run android:sync
```

4. **Clean Android build:**
```bash
cd android
./gradlew clean
cd ..
```

5. **Build release AAB:**
```bash
npm run android:release
```

### Verification

- [ ] AAB builds without errors
- [ ] AAB file exists at `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Test install on device using: `adb install -r android/app/build/outputs/apk/release/app-release.apk` (generate APK for testing)
- [ ] App launches successfully
- [ ] All screens are navigable
- [ ] No blank screens or crashes
- [ ] Works offline (airplane mode)
- [ ] No console errors in release build

### Generating APK for Testing

To generate a release APK (for testing, not for Play Store):
```bash
cd android
./gradlew assembleRelease
```

APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Play Store Upload

1. Use Android App Bundle (AAB) format - **DO NOT** upload APK
2. Upload the AAB file generated at: `android/app/build/outputs/bundle/release/app-release.aab`
3. Fill out all required store listing information
4. Complete content rating questionnaire
5. Set up pricing and distribution
6. Submit for review

## Troubleshooting

### Build Errors

- **"SDK location not found"**: Create `android/local.properties` with:
  ```
  sdk.dir=/path/to/your/android/sdk
  ```

- **"Build failed"**: Clean and rebuild:
  ```bash
  cd android
  ./gradlew clean
  ./gradlew bundleRelease
  ```

- **"Capacitor sync failed"**: Ensure web build succeeded first:
  ```bash
  npm run build
  npm run android:sync
  ```

### Runtime Issues

- **App crashes on launch**: Check `adb logcat` for errors
- **Blank screen**: Verify `dist` folder contains built assets after `npm run build`
- **localStorage not working**: App falls back to in-memory storage automatically

## Project Structure

```
apps/mobile-web/
├── android/           # Android native project
├── src/              # React source code
│   ├── components/   # Reusable components
│   ├── screens/      # App screens
│   ├── utils/        # Utilities (storage, logger)
│   └── hooks/        # Custom React hooks
├── dist/             # Built web assets (generated)
├── capacitor.config.ts  # Capacitor configuration
├── vite.config.ts    # Vite build configuration
└── package.json      # Dependencies and scripts
```

## Offline-First Architecture

The app is designed to work completely offline:
- All data stored in localStorage with fallback to memory
- No network calls required
- Mock data used when backend unavailable
- Error boundaries prevent blank screens

## Performance Optimizations

- Production builds minify and remove console.log
- Lazy image loading with Intersection Observer
- Virtual scrolling for long lists (where applicable)
- Code splitting for vendor libraries
- Optimized bundle size with tree shaking