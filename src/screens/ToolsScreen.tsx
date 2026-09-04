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
  QrCode,
  Grid3x3,
  LockKeyhole,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { useImportImages } from '../hooks/useImportImages';
import { pickImages } from '../services/gallery';
import { useT } from '../i18n';
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
  const t = useT();

  const ocrImage = async () => {
    const [uri] = await pickImages(1);
    if (uri) navigation.navigate('Ocr', { uri, name: 'Image', kind: 'image' });
  };

  const groups: { title: string; tools: Tool[] }[] = [
    {
      title: t('tools.create'),
      tools: [
        { icon: ScanLine, label: t('tools.scanDoc'), hint: t('tools.scanDocSub'), onPress: () => navigation.navigate('Scanner') },
        { icon: Grid2x2, label: t('home.collage'), hint: t('tools.collageSub'), onPress: () => navigation.navigate('CollageStudio') },
        { icon: ImagePlus, label: t('home.imgToPdf'), hint: t('tools.imgPdfSub'), onPress: importImages },
        { icon: RefreshCw, label: t('home.convert'), hint: t('home.convertSub'), onPress: () => navigation.navigate('Convert') },
        { icon: ScanText, label: t('tools.scanText'), hint: t('tools.scanTextSub'), onPress: ocrImage },
      ],
    },
    {
      title: t('qr.section'),
      tools: [
        { icon: QrCode, label: t('qr.scanQr'), hint: t('qr.scanQrSub'), onPress: () => navigation.navigate('ScanQr') },
        { icon: Grid3x3, label: t('qr.createQr'), hint: t('qr.createQrSub'), onPress: () => navigation.navigate('CreateQr') },
        { icon: LockKeyhole, label: t('qr.secretQr'), hint: t('qr.secretQrSub'), onPress: () => navigation.navigate('CreateQr', { mode: 'secret' }) },
      ],
    },
    {
      title: t('tools.library'),
      tools: [
        { icon: FolderOpen, label: t('tools.myDocs'), hint: t('tools.myDocsSub'), onPress: () => navigation.navigate('Documents') },
      ],
    },
  ];

  return (
    <Screen scroll>
      <Text variant="display" style={styles.title}>
        {t('tools.title')}
      </Text>
      {groups.map((g, gi) => (
        <View key={g.title} style={styles.group}>
          <Text variant="title" style={styles.groupTitle}>
            {g.title}
          </Text>
          {g.tools.map((tool, i) => (
            <Animated.View key={tool.label} entering={FadeInDown.delay((gi * 3 + i) * 50).springify().damping(18)}>
              <ToolRow {...tool} />
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
