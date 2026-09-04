import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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
import { useTheme, type Theme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import type { TabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();
const APressable = Animated.createAnimatedComponent(Pressable);

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

/** A single tab: animated Material-3 pill behind the icon when active. */
function TabButton({
  focused, icon: Icon, label, onPress, theme,
}: { focused: boolean; icon: LucideIcon; label: string; onPress: () => void; theme: Theme }) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, p]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.7 + p.value * 0.3 }],
  }));

  const color = focused ? theme.colors.brand : theme.colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      style={styles.item}
    >
      <View style={styles.iconSlot}>
        <Animated.View
          style={[styles.pill, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.pill }, pillStyle]}
        />
        <Icon size={22} color={color} />
      </View>
      <Text variant="label" style={{ color, fontWeight: focused ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

/** Premium floating tab bar with an animated active pill + raised center Create FAB. */
function PremiumTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const importImages = useImportImages();
  const [createSheet, setCreateSheet] = useState(false);
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  const openPdf = async () => {
    const picked = await pickPdf();
    // getParent() is the root stack; params aren't known to the tab nav's types.
    if (picked) (navigation.getParent() as any)?.navigate('PdfPreview', { uri: picked.uri, name: picked.name, editable: true });
  };

  return (
    <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
            borderRadius: theme.radius.pill,
          },
          theme.elevation(3),
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          if (route.name === 'Scan') {
            return (
              <View key={route.key} style={styles.item}>
                <APressable
                  onPressIn={() => { fabScale.value = withSpring(0.9, { damping: 14 }); }}
                  onPressOut={() => { fabScale.value = withSpring(1, { damping: 12 }); }}
                  onPress={() => { haptics.light(); setCreateSheet(true); }}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.createSheet')}
                  style={[styles.fabWrap, fabStyle]}
                >
                  <LinearGradient colors={theme.colors.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
                    <Plus size={28} color="#FFFFFF" />
                  </LinearGradient>
                </APressable>
              </View>
            );
          }

          return (
            <TabButton
              key={route.key}
              focused={focused}
              icon={TAB_ICONS[route.name] ?? House}
              label={t(`tab.${route.name.toLowerCase()}` as never)}
              theme={theme}
              onPress={() => {
                haptics.light();
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
        })}
      </View>

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
  // transparent footprint the navigator reserves; the bar floats inside it
  host: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconSlot: { width: 52, height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  pill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fabWrap: { marginTop: -34 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
