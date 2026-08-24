import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from '../components/Text';
import { HIT_SLOP, useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

/** Full-screen page viewer, presented as a modal. */
export function PagePreviewScreen({
  route,
  navigation,
}: RootScreenProps<'PagePreview'>) {
  const theme = useTheme();
  const { uri, index, total } = route.params;
  return (
    <View style={styles.backdrop}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.bar}>
          <Text variant="bodyStrong" style={styles.barText}>
            Page {index + 1} of {total}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
          >
            <X size={theme.iconSize.lg} color="#FFFFFF" />
          </Pressable>
        </View>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  barText: { color: '#FFFFFF' },
  image: { flex: 1, width: '100%' },
});
