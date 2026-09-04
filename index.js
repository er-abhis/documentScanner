/**
 * @format
 */

// Polyfill crypto.getRandomValues (Hermes ships no CSPRNG) so Secret-QR
// AES-256-GCM key/nonce generation has real entropy. Must load first.
import 'react-native-get-random-values';
import { AppRegistry, LogBox } from 'react-native';
import { enableScreens, enableFreeze } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

// Native screen containers + react-freeze: blurred/off-screen routes stop
// re-rendering (pairs with freezeOnBlur), keeping transitions at 60fps.
enableScreens(true);
enableFreeze(true);

// The dev LogBox notification overlays and can intercept touches; hide it in
// dev builds (it never ships in release). Warnings are still in Metro logs.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

AppRegistry.registerComponent(appName, () => App);
