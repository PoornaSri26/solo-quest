# Mobile App Setup Guide

This guide covers the complete setup for building Solo Quest as a native mobile app using Capacitor.

## Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)
- Capacitor CLI

## Installation

```bash
# Install Capacitor CLI
npm install @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios

# Install push notification plugins
npm install @capacitor/push-notifications @capacitor/local-notifications

# Sync Capacitor configuration
npx cap sync
```

## Configuration

The Capacitor configuration is in `capacitor.config.ts`:

```typescript
{
  appId: 'com.soloquest.app',
  appName: 'Solo Quest',
  webDir: 'dist',
  plugins: {
    PushNotifications: { /* ... */ },
    LocalNotifications: { /* ... */ }
  }
}
```

## Building for Android

```bash
# Build the web app
npm run build

# Sync with Android
npx cap sync android

# Open Android Studio
npx cap open android
```

### Android Build Steps

1. Open Android Studio
2. Wait for Gradle sync to complete
3. Build APK: Build > Build Bundle(s) / APK(s) > Build APK(s)
4. Or build release bundle: Build > Generate Signed Bundle / APK

### Android Manifest

The Android manifest is configured with:
- Package name: `com.soloquest.app`
- App label: `Solo Quest`
- Main activity with proper configuration changes
- Required permissions will be added dynamically

## Building for iOS

```bash
# Build the web app
npm run build

# Sync with iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

### iOS Build Steps

1. Open Xcode
2. Select your development team
3. Update signing certificates
4. Build: Product > Build
5. Archive: Product > Archive
6. Distribute via App Store Connect

### iOS Configuration

- Bundle Identifier: `com.soloquest.app`
- Display Name: `Solo Quest`
- Deployment Target: iOS 13.0+
- Capabilities: Push Notifications, Background Modes

## Push Notifications

### Setup

Push notifications are configured in `src/lib/pushNotifications.ts`:

```typescript
import { PushNotificationService } from './lib/pushNotifications';

// Initialize in your app
PushNotificationService.initialize();
```

### Android Setup

1. Add Firebase to your Android project
2. Add `google-services.json` to `android/app/`
3. Configure Firebase Cloud Messaging
4. Add FCM server key to backend environment

### iOS Setup

1. Enable Push Notifications in Apple Developer Portal
2. Generate push notification certificates
3. Add certificates to Xcode project
4. Configure APNs in backend

## Widgets

Solo Quest supports home screen widgets for quick access to:

- Current streak count
- Active quests count
- Daily dungeon status
- Quick quest completion

### Android Widgets

Android widgets are configured in the Android project with:
- Widget layout XML files
- Widget provider classes
- Widget update service

### iOS Widgets

iOS widgets are configured using WidgetKit:
- Widget timeline provider
- Widget configuration
- Widget entry views

## Local Notifications

Local notifications are handled by `@capacitor/local-notifications`:

```typescript
import { PushNotificationService } from './lib/pushNotifications';

// Schedule a reminder
await PushNotificationService.scheduleLocalNotification({
  title: 'Quest Reminder',
  body: 'Complete your quest!',
  schedule: { at: new Date() }
});
```

## Testing

### Testing on Android

```bash
# Run on connected device/emulator
npx cap run android
```

### Testing on iOS

```bash
# Run on connected device/simulator
npx cap run ios
```

## Deployment

### Android Deployment

1. Build release APK or AAB
2. Upload to Google Play Console
3. Complete store listing
4. Submit for review

### iOS Deployment

1. Archive the app in Xcode
2. Upload to App Store Connect
3. Complete store listing
4. Submit for review

## Troubleshooting

### Build Issues

- Ensure all dependencies are installed
- Clear Capacitor cache: `npx cap clean`
- Re-sync: `npx cap sync`

### Push Notification Issues

- Verify Firebase/APNs configuration
- Check device permissions
- Test with push notification tools

### Plugin Issues

- Check plugin compatibility
- Update Capacitor CLI: `npm install @capacitor/cli@latest`
- Sync after plugin changes: `npx cap sync`

## Performance Optimization

- Enable code splitting
- Optimize images and assets
- Use service workers for offline support
- Implement lazy loading for components

## Security

- Secure API endpoints
- Validate push notification payloads
- Use certificate pinning for API calls
- Implement proper authentication

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation/)