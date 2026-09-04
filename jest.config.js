module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // @react-native-ml-kit ships untranspiled TS (main: index.ts) — let Babel transform it.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-ml-kit|@noble|react-native-vision-camera|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-linear-gradient|react-native-screens|react-native-fs|lucide-react-native)/)',
  ],
};
