import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { CollageThumb } from '../components/collage/CollageThumb';
import { TEMPLATES, CATEGORIES } from '../services/collage/templates';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function CollageStudioScreen({ navigation }: RootScreenProps<'CollageStudio'>) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState('All');

  const list = cat === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === cat);
  const colW = (width - 20 * 2 - 14) / 2; // 2 columns, 20 page pad, 14 gap

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title="Collage Studio" onBack={() => navigation.goBack()} />
        <Text variant="caption" color="textSecondary" style={styles.sub}>
          Pick a layout, then fill it with your photos.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cats}
      >
        {CATEGORIES.map(c => {
          const active = c === cat;
          return (
            <Pressable
              key={c}
              onPress={() => setCat(c)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.brand : theme.colors.surfaceAlt,
                  borderRadius: theme.radius.pill,
                },
              ]}
            >
              <Text variant="callout" style={{ color: active ? theme.colors.onBrand : theme.colors.textSecondary }}>
                {c}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {list.map((t, i) => (
          <Animated.View key={t.id} entering={FadeIn.delay(Math.min(i, 8) * 40)} style={{ width: colW }}>
            <Pressable
              onPress={() => navigation.navigate('CollageEditor', { templateId: t.id })}
              accessibilityRole="button"
              accessibilityLabel={`${t.name} layout`}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }, theme.elevation(1)]}
            >
              <View style={[styles.thumbBox, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.md }]}>
                <CollageThumb template={t} width={colW - 20} />
              </View>
              <View style={styles.cardMeta}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {t.name}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {t.category} · {t.ratio}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  sub: { marginBottom: 4, marginLeft: 4 },
  cats: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8 },
  grid: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { padding: 10, borderWidth: StyleSheet.hairlineWidth },
  thumbBox: { alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'hidden' },
  cardMeta: { marginTop: 10 },
});
