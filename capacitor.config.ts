import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.perezcode.vibeup',
  appName: 'VibeUp',
  webDir: 'dist',
  server: {
    androidScheme: 'https', // Required for Geolocation and some APIs
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set path if using signing
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FF6B9D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      permissions: {
        location: {
          alias: 'location',
          description: 'Used to show your location and find nearby profiles',
        },
      },
    },
  },
};

export default config;
