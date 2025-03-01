module.exports = {
  name: "AbleNav",
  slug: "able-nav",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/images/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./src/assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#1a73e8"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  sdkVersion: "52.0.0",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "AbleNav needs access to your location to provide navigation assistance.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "AbleNav needs access to your location to provide navigation assistance."
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/adaptive-icon.png",
      backgroundColor: "#1a73e8"
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ]
  },
  web: {
    favicon: "./src/assets/images/favicon.png"
  }
}; 