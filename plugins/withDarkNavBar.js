const { withAndroidStyles, AndroidConfig } = require("expo/config-plugins");

/**
 * Android 3-button navigation: paint the system bar in the app's bar colour instead of the
 * OEM default (light grey on MIUI), with light buttons and no contrast scrim.
 */
module.exports = (config) =>
  withAndroidStyles(config, (cfg) => {
    const set = (name, value) => {
      cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
        add: true, parent: AndroidConfig.Styles.getAppThemeGroup(), name, value,
      });
    };
    set("android:navigationBarColor", "#100C0A");
    set("android:windowLightNavigationBar", "false");
    set("android:enforceNavigationBarContrast", "false");
    return cfg;
  });
