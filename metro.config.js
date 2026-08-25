const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Native Gradle/CMake builds churn transient dirs under android/.cxx and
    // build/. Without watchman, Metro's fallback watcher throws ENOENT when one
    // vanishes mid-build and the whole bundler dies. Exclude build artifacts.
    blockList: /.*\/(?:\.cxx|android\/build|android\/app\/build)\/.*/,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
