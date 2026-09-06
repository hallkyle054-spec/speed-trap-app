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
    // Listed before react-native-android-widget so it runs after it: Expo
    // applies mods in reverse registration order, and this one edits the
    // manifest entry and provider XML that plugin writes.
    './plugins/with-cover-screen',
    [
      // A standard Android app widget. Tapping it opens Verge, which is the
      // point of it: one tap from a closed phone to the live map.
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
            description:
              'The nearest published enforcement zone, and how far it is. Tap to open Verge.',
            // A Flex Window widget: the cover screen gives it the whole panel.
            // These are the dimensions of a widget already living on this
            // phone's cover screen, copied rather than guessed. No
            // `targetCellWidth`/`targetCellHeight` — declaring cells makes
            // Android place it on a home-screen grid instead, and the cover
            // screen is not a grid. It stays resizable, and picks its layout
            // from the size Android actually gives it.
            minWidth: '339dp',
            minHeight: '352dp',
            resizeMode: 'horizontal|vertical',
            // Without this the picker has nothing to draw: the widget's own
            // layout is a transparent frame that the app fills with a bitmap at
            // runtime, so the entry renders as an empty tile and is very easy
            // to scroll straight past.
            previewImage: './assets/widget-preview.png',
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
