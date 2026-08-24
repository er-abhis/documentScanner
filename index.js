/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// The dev LogBox notification overlays and can intercept touches; hide it in
// dev builds (it never ships in release). Warnings are still in Metro logs.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

AppRegistry.registerComponent(appName, () => App);
