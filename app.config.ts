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
      // A standard Android app widget. Samsung's Flex Window surfaces these on
      // the cover screen, so this is what a Flip cover widget is made of.
      'react-native-android-widget',
      {
        fonts: [
          './node_modules/@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf',
          './node_modules/@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf',
        ],
        widgets: [
          {
            name: 'Verge',
            label: 'Verge · published zones',
            description: 'The nearest published enforcement zone, and how far it is.',
            minWidth: '110dp',
            minHeight: '58dp',
            targetCellWidth: 2,
            targetCellHeight: 1,
            resizeMode: 'horizontal|vertical',
            // Half an hour is Android's floor for automatic redraws; the app
            // also pushes an update whenever it learns something new.
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
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
