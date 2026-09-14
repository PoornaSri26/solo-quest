# Mobile App Wrapper (Capacitor)

This project supports mobile deployment using Capacitor.

## Setup

### iOS
```bash
npm run build
npm run cap:sync
npm run cap:open:ios
```

### Android
```bash
npm run build
npm run cap:sync
npm run cap:open:android
```

## Configuration

- **App ID**: `com.soloquest.app`
- **App Name**: Solo Quest
- **Web Directory**: `dist`
- **iOS Bundle ID**: `com.soloquest.app`
- **Android Package**: `com.soloquest.app`

## Build Process

1. Build the web app: `npm run build`
2. Sync assets to native projects: `npm run cap:sync`
3. Open native IDE: `npm run cap:open:ios` or `npm run cap:open:android`
4. Build and run from Xcode or Android Studio

## Native Permissions

The app currently requires minimal permissions. Additional plugins can be added as needed:
- Camera (for profile photos)
- Notifications (for quest reminders)
- Storage (for offline data)

## Platform-Specific Notes

### iOS
- Requires Xcode 14+
- Minimum iOS version: 13.0
- Targets iPhone and iPad

### Android
- Requires Android Studio with SDK 33+
- Minimum Android version: 7.0 (API 24)
- Targets all form factors

## Development Workflow

For rapid web development, use `npm run dev` and test in a browser. Capacitor is primarily for building and testing the native experience.

To test Capacitor features during development:
```bash
npm run build
npm run cap:sync
npm run cap:open:ios  # or android
```

Then run from the native IDE.