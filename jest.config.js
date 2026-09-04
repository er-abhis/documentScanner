module.exports = {
  preset: '@react-native/jest-preset',
  // @react-native-ml-kit ships untranspiled TS (main: index.ts) — let Babel transform it.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-ml-kit|@noble)/)',
  ],
};
