/**
 * Document Scanner
 * @format
 */
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DraftProvider } from './src/state/draft';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { I18nProvider } from './src/i18n';
import { Splash } from './src/components/Splash';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ToastProvider } from './src/components/Toast';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <I18nProvider>
            <SafeAreaProvider>
              <ToastProvider>
                <DraftProvider>
                  <RootNavigator />
                </DraftProvider>
                {showSplash && <Splash onDone={() => setShowSplash(false)} />}
              </ToastProvider>
            </SafeAreaProvider>
          </I18nProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
