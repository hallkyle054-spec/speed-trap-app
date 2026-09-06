const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

/**
 * Lets Verge fill a Flip's cover display instead of being letterboxed into a
 * box in the middle of it.
 *
 * Android puts an activity into device-compatibility mode — a fixed-size window
 * with bars around it — unless the activity says it can be resized. Expo's
 * template says nothing either way, and the cover screen is both small and
 * roughly square, so the default lands Verge in a portrait-shaped box on a
 * landscape-shaped screen. `resizeableActivity` is the documented opt-out;
 * `android.supports_size_changes` is the companion flag that tells the system
 * the app redraws on a size change rather than needing a restart, which is what
 * folding and unfolding the phone does.
 *
 * The app is still declared portrait for the main display. A resizable activity
 * does not get its orientation request honoured on a display the system manages
 * for it, which is exactly the behaviour we want on the cover screen.
 */
module.exports = function withCoverScreen(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(
      cfg.modResults,
    );
    activity.$["android:resizeableActivity"] = "true";

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      "android.supports_size_changes",
      "true",
    );

    return cfg;
  });
};
