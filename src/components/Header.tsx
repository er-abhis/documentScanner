import { StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from './Text';
import { IconButton } from './IconButton';

type Props = {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

/**
 * Compact screen header (safe-area is handled by the Screen wrapper). Used with
 * headerShown:false so the whole app shares one header style.
 */
export function Header({ title, onBack, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <IconButton
            icon={ChevronLeft}
            onPress={onBack}
            accessibilityLabel="Go back"
          />
        ) : null}
      </View>
      <Text variant="title" numberOfLines={1} style={styles.title}>
        {title ?? ''}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: { minWidth: 44, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 44 },
  title: { flex: 1, textAlign: 'center', marginHorizontal: 8 },
});
