/**
 * Document Scanner
 * @format
 */
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DraftProvider } from './src/state/draft';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { I18nProvider } from './src/i18n';

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <I18nProvider>
          <SafeAreaProvider>
            <DraftProvider>
              <RootNavigator />
            </DraftProvider>
          </SafeAreaProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default App;
