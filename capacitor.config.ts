import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soloquest.app',
  appName: 'Solo Quest',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      androidSplashFullScreen: true,
      iosSplashResourceName: 'splash',
      iosSplashStyle: 'fullscreen',
      iosSpinnerStyle: 'large',
      spinnerColor: '#a855f7',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#a855f7',
      sound: 'beep.wav',
    },
    App: {
      launchUrl: 'https://soloquest.app',
    },
  },
};

export default config;