module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Must be listed last. reanimated v4 ships its worklets babel plugin here.
  plugins: ['react-native-worklets/plugin'],
};
