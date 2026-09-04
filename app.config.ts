import type { ExpoConfig } from 'expo/config';

/**
 * The Google Maps key is read from the environment so it never lands in the
 * repo. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (and, when the ingest job exists,
 * EXPO_PUBLIC_ZONE_FEED_URL) before building — see the README.
 */
const config: ExpoConfig = {
  name: 'Verge',
  slug: 'verge',
  scheme: 'verge',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // 'automatic' lets `Appearance → System` follow Configuration.uiMode.
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.hallkyle054.verge',
    adaptiveIcon: {
      backgroundColor: '#f3f2f2',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' },
    },
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.hallkyle054.verge',
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Verge uses your location to measure how far away a published enforcement zone is while you drive.',
      },
    ],
  ],
};

export default config;
