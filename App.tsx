/**
 * Document Scanner
 * @format
 */
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DraftProvider } from './src/state/draft';

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DraftProvider>
          <RootNavigator />
        </DraftProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
