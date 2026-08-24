import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, FileText, ScanLine, LayoutGrid, Settings as SettingsIcon } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { ToolsScreen } from '../screens/ToolsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme';
import type { TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

/** Empty component for the Scan action tab (its press is intercepted). */
function ScanPlaceholder() {
  return null;
}

export function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ tabBarIcon: ({ color, size }) => <FileText color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanPlaceholder}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size + 2} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.getParent()?.navigate('Scanner');
          },
        })}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{ tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

