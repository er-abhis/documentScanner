import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import { TabNavigator } from './TabNavigator';
import { ScannerScreen } from '../screens/ScannerScreen';
import { PagesScreen } from '../screens/PagesScreen';
import { DocumentScreen } from '../screens/DocumentScreen';
import { JoinerScreen } from '../screens/JoinerScreen';
import { CollageStudioScreen } from '../screens/CollageStudioScreen';
import { CollageEditorScreen } from '../screens/CollageEditorScreen';
import { OrganizeScreen } from '../screens/OrganizeScreen';
import { PdfEditorScreen } from '../screens/PdfEditorScreen';
import { ConvertScreen } from '../screens/ConvertScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { AnnotateScreen } from '../screens/AnnotateScreen';
import { PdfPreviewScreen } from '../screens/PdfPreviewScreen';
import { PagePreviewScreen } from '../screens/PagePreviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.brand,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="Pages" component={PagesScreen} />
        <Stack.Screen name="Joiner" component={JoinerScreen} />
        <Stack.Screen name="CollageStudio" component={CollageStudioScreen} />
        <Stack.Screen name="CollageEditor" component={CollageEditorScreen} />
        <Stack.Screen name="Document" component={DocumentScreen} />
        <Stack.Screen name="Organize" component={OrganizeScreen} />
        <Stack.Screen name="PdfEditor" component={PdfEditorScreen} />
        <Stack.Screen name="Convert" component={ConvertScreen} />
        <Stack.Screen name="Editor" component={EditorScreen} />
        <Stack.Screen name="Annotate" component={AnnotateScreen} />
        <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} />
        <Stack.Group screenOptions={{ presentation: 'fullScreenModal', animation: 'fade' }}>
          <Stack.Screen name="PagePreview" component={PagePreviewScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
