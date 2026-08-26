import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, FileText, Plus, LayoutGrid, Settings as SettingsIcon, ScanLine, ImagePlus, FolderOpen, FilePen, type LucideIcon } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { ToolsScreen } from '../screens/ToolsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Text } from '../components/Text';
import { ActionSheet } from '../components/ActionSheet';
import { useImportImages } from '../hooks/useImportImages';
import { pickPdf } from '../services/pdf/pickPdf';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

/** Empty component for the center Create action (its press is intercepted). */
function CreatePlaceholder() {
  return null;
}

const TAB_ICONS: Record<string, LucideIcon> = {
  Home: House,
  Documents: FileText,
  Tools: LayoutGrid,
  Settings: SettingsIcon,
};

/** Premium floating tab bar with a raised purple center Create FAB. */
function PremiumTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const importImages = useImportImages();
  const [createSheet, setCreateSheet] = useState(false);

  const openPdf = async () => {
    const picked = await pickPdf();
    // getParent() is the root stack; params aren't known to the tab nav's types.
    if (picked) (navigation.getParent() as any)?.navigate('PdfPreview', { uri: picked.uri, name: picked.name, editable: true });
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;

        if (route.name === 'Scan') {
          return (
            <View key={route.key} style={styles.item}>
              <Pressable
                onPress={() => { haptics.light(); setCreateSheet(true); }}
                accessibilityRole="button"
                accessibilityLabel={t('home.createSheet')}
                style={({ pressed }) => [styles.fabWrap, pressed && { transform: [{ scale: 0.94 }] }]}
              >
                <LinearGradient colors={theme.colors.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
                  <Plus size={28} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          );
        }

        const Icon = TAB_ICONS[route.name] ?? House;
        const color = focused ? theme.colors.brand : theme.colors.textTertiary;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            android_ripple={{ color: theme.colors.border, borderless: true }}
            style={styles.item}
          >
            <Icon size={22} color={color} />
            <Text variant="label" style={{ color, marginTop: 4 }}>{t(`tab.${route.name.toLowerCase()}` as never)}</Text>
          </Pressable>
        );
      })}

      <ActionSheet
        visible={createSheet}
        title={t('home.createSheet')}
        onClose={() => setCreateSheet(false)}
        actions={[
          { label: t('tools.scanDoc'), icon: ScanLine, onPress: () => navigation.getParent()?.navigate('Scanner' as never) },
          { label: t('home.createPdf'), icon: FilePen, onPress: importImages },
          { label: t('home.imgToPdf'), icon: ImagePlus, onPress: importImages },
          { label: t('home.openPdf'), icon: FolderOpen, onPress: openPdf },
        ]}
      />
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <PremiumTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Documents" component={DocumentsScreen} />
      <Tab.Screen name="Scan" component={CreatePlaceholder} />
      <Tab.Screen name="Tools" component={ToolsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { marginTop: -28 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
