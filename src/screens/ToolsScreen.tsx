import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScanLine,
  ImagePlus,
  Grid2x2,
  FolderOpen,
  RefreshCw,
  ScanText,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { useImportImages } from '../hooks/useImportImages';
import { pickImages } from '../services/gallery';
import { useTheme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Central hub for every functional tool. Only tools that actually work are
 * listed here — new tools are added as their features land (convert, collage,
 * PDF merge/split, …). No placeholders.
 */
export function ToolsScreen() {
  const navigation = useNavigation<Nav>();
  const importImages = useImportImages();

  const ocrImage = async () => {
    const [uri] = await pickImages(1);
    if (uri) navigation.navigate('Ocr', { uri, name: 'Image', kind: 'image' });
  };

  const groups: { title: string; tools: Tool[] }[] = [
    {
      title: 'Create',
      tools: [
        { icon: ScanLine, label: 'Scan Document', hint: 'Camera + auto edge detection', onPress: () => navigation.navigate('Scanner') },
        { icon: Grid2x2, label: 'Collage Studio', hint: 'Templates, frames, export', onPress: () => navigation.navigate('CollageStudio') },
        { icon: ImagePlus, label: 'Image → PDF', hint: 'Pick photos, reorder, export', onPress: importImages },
        { icon: RefreshCw, label: 'Convert Image', hint: 'JPG · PNG · WEBP', onPress: () => navigation.navigate('Convert') },
        { icon: ScanText, label: 'Scan to Text', hint: 'On-device OCR from a photo', onPress: ocrImage },
      ],
    },
    {
      title: 'Library',
      tools: [
        { icon: FolderOpen, label: 'My Documents', hint: 'Open, organize, share', onPress: () => navigation.navigate('Documents') },
      ],
    },
  ];

  return (
    <Screen scroll>
      <Text variant="display" style={styles.title}>
        Tools
      </Text>
      {groups.map((g, gi) => (
        <View key={g.title} style={styles.group}>
          <Text variant="title" style={styles.groupTitle}>
            {g.title}
          </Text>
          {g.tools.map((t, i) => (
            <Animated.View key={t.label} entering={FadeInDown.delay((gi * 3 + i) * 50).springify().damping(18)}>
              <ToolRow {...t} />
            </Animated.View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

type Tool = { icon: LucideIcon; label: string; hint: string; onPress: () => void };

function ToolRow({ icon: Icon, label, hint, onPress }: Tool) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: theme.mode === 'dark' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        theme.elevation(1),
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.brandSubtle, borderRadius: theme.radius.md }]}>
        <Icon size={theme.iconSize.md} color={theme.colors.brand} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 12, marginBottom: 12 },
  group: { marginBottom: 20 },
  groupTitle: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  text: { flex: 1 },
});
