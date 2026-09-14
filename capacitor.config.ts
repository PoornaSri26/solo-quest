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
  },
};

export default config;