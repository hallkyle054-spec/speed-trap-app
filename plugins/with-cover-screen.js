const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const WIDGET = 'Verge';
/** The generated provider XML this widget's file is named after. */
const providerXml = name => `widgetprovider_${name.toLowerCase()}.xml`;
const samsungXml = name => `samsung_widgetprovider_${name.toLowerCase()}.xml`;
const previewLayout = name => `widgetpreview_${name.toLowerCase()}.xml`;

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
 * 2. The widget is offered on the Flex Window. Three things together, checked
 *    against a widget that is already on this phone's cover screen rather than
 *    worked out from documentation:
 *
 *      - a `com.samsung.android.appwidget.provider` meta-data pointing at a
 *        `<samsung-appwidget-provider display="sub_screen">` resource,
 *      - `android:widgetCategory="home_screen|keyguard"`, and
 *      - an **exported** receiver.
 *
 *    react-native-android-widget writes `home_screen` and `exported="false"`
 *    and knows nothing about the Samsung resource, so all three are applied
 *    here. Exporting the receiver is what lets Samsung's cover-screen host —
 *    a separate app — see the provider at all; a non-exported one is invisible
 *    to it. The receiver only acts on its own `<package>.WIDGET…` actions and
 *    the worst another app can do with it is ask for a redraw, so the exposure
 *    is small and it is the price of being listed.
 *
 *    A `previewLayout` goes with them. The cover-screen picker draws a live,
 *    panel-sized preview of each widget rather than a thumbnail, and a widget
 *    offering only a `previewImage` gives it nothing to draw with. The library
 *    only supports `previewImage`, so this generates a one-view layout that
 *    renders that same image and points `previewLayout` at it — both are then
 *    present and both show the same artwork.
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
    // Samsung's cover-screen host is a different app, and cannot enumerate a
    // provider it is not allowed to see.
    receiver.$['android:exported'] = 'true';

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

      // A layout whose whole job is to draw the preview artwork, so the
      // picker has something to render at panel size.
      const layoutDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/layout');
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.writeFileSync(
        path.join(layoutDir, previewLayout(WIDGET)),
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<ImageView xmlns:android="http://schemas.android.com/apk/res/android"\n' +
          '    android:layout_width="match_parent"\n' +
          '    android:layout_height="match_parent"\n' +
          '    android:scaleType="centerCrop"\n' +
          `    android:src="@drawable/${WIDGET.toLowerCase()}_preview" />\n`,
      );

      // The library writes this file itself with widgetCategory hardcoded to
      // home_screen. Samsung wants keyguard for a Flex Window widget.
      const generated = path.join(xmlDir, providerXml(WIDGET));
      const before = fs.readFileSync(generated, 'utf8');
      const after = before
        .replace(
          'android:widgetCategory="home_screen"',
          'android:widgetCategory="home_screen|keyguard"',
        )
        .replace(
          `android:previewImage="@drawable/${WIDGET.toLowerCase()}_preview"`,
          `android:previewImage="@drawable/${WIDGET.toLowerCase()}_preview"\n` +
            `    android:previewLayout="@layout/${previewLayout(WIDGET).replace(/\.xml$/, '')}"`,
        );
      if (!after.includes('android:previewLayout')) {
        throw new Error(
          'withCoverScreen: could not add previewLayout. The widget must declare a ' +
            'previewImage in app.config.ts for this to hang off.',
        );
      }
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
