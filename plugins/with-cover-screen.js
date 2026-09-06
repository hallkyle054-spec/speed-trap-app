const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const WIDGET = 'Verge';
/** The generated provider XML this widget's file is named after. */
const providerXml = name => `widgetprovider_${name.toLowerCase()}.xml`;
const samsungXml = name => `samsung_widgetprovider_${name.toLowerCase()}.xml`;

/**
 * Two Samsung-specific things, both from Samsung's own Flex Window guidance.
 *
 * 1. The app fills a Flip's cover display instead of being letterboxed into a
 *    box in the middle of it. Android puts an activity into
 *    device-compatibility mode — a fixed-size window with bars around it —
 *    unless the activity says it can be resized. Expo's template says nothing
 *    either way, and the cover screen is both small and roughly square, so the
 *    default lands Verge in a portrait-shaped box on a landscape-shaped screen.
 *    `resizeableActivity` is the documented opt-out;
 *    `android.supports_size_changes` is the companion flag saying the app
 *    redraws on a size change rather than needing a restart, which is what
 *    folding and unfolding the phone does.
 *
 *    The app is still declared portrait for the main display. A resizable
 *    activity does not get its orientation request honoured on a display the
 *    system manages for it, which is the behaviour we want on the cover screen.
 *
 * 2. The widget is declared to Samsung as a cover-screen widget. Samsung's
 *    documented opt-in is a `com.samsung.android.appwidget.provider` meta-data
 *    pointing at a `<samsung-appwidget-provider display="sub_screen">`
 *    resource, alongside the `keyguard` widget category.
 *    react-native-android-widget knows nothing about either and hardcodes
 *    `home_screen`, so both are applied here. The category keeps `home_screen`
 *    as well: on a Flip 7 the cover screen draws from the home-screen widget
 *    set rather than the full-screen panels the `sub_screen` mechanism was
 *    written for, so the widget has to be both.
 *
 *    Whether this is enough is Samsung's call, not ours. Reporting on the
 *    Flip 7 says the cover screen only offers a curated set of widgets —
 *    largely Samsung's own — regardless of what an app declares. This is the
 *    whole of the documented opt-in; if the widget still is not offered, no
 *    further manifest change will do it.
 */
module.exports = function withCoverScreen(config) {
  config = withAndroidManifest(config, cfg => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.$['android:resizeableActivity'] = 'true';

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'android.supports_size_changes',
      'true',
    );

    const receiver = (application.receiver ?? []).find(r =>
      (r.$['android:name'] ?? '').endsWith(`.${WIDGET}`),
    );
    if (!receiver) {
      throw new Error(
        `withCoverScreen: no receiver for the ${WIDGET} widget. It must be declared in ` +
          'app.config.ts, and this plugin must be listed after react-native-android-widget.',
      );
    }
    // The XML parser hands back a bare object when a receiver has a single
    // meta-data child, and an array when it has several.
    const existing = receiver['meta-data'];
    receiver['meta-data'] = (
      Array.isArray(existing) ? existing : existing ? [existing] : []
    ).filter(m => m.$['android:name'] !== 'com.samsung.android.appwidget.provider');
    receiver['meta-data'].push({
      $: {
        'android:name': 'com.samsung.android.appwidget.provider',
        'android:resource': `@xml/${samsungXml(WIDGET).replace(/\.xml$/, '')}`,
      },
    });

    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    cfg => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });

      fs.writeFileSync(
        path.join(xmlDir, samsungXml(WIDGET)),
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<samsung-appwidget-provider\n    display="sub_screen">\n' +
          '</samsung-appwidget-provider>\n',
      );

      // The library writes this file itself with widgetCategory hardcoded to
      // home_screen. Samsung wants keyguard for a Flex Window widget.
      const generated = path.join(xmlDir, providerXml(WIDGET));
      const before = fs.readFileSync(generated, 'utf8');
      const after = before.replace(
        'android:widgetCategory="home_screen"',
        'android:widgetCategory="home_screen|keyguard"',
      );
      if (after === before) {
        throw new Error(
          `withCoverScreen: could not set widgetCategory in ${providerXml(WIDGET)}. ` +
            'react-native-android-widget may have changed how it writes the provider XML.',
        );
      }
      fs.writeFileSync(generated, after);

      return cfg;
    },
  ]);
};
