import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { CollageThumb } from '../components/collage/CollageThumb';
import { TEMPLATES, CATEGORIES } from '../services/collage/templates';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

export function CollageStudioScreen({ navigation }: RootScreenProps<'CollageStudio'>) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState('All');

  const list = cat === 'All' ? TEMPLATES : TEMPLATES.filter(tpl => tpl.category === cat);
  const colW = (width - 20 * 2 - 14) / 2; // 2 columns, 20 page pad, 14 gap

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header title={t('collage.title')} onBack={() => navigation.goBack()} />
        <Text variant="caption" color="textSecondary" style={styles.sub}>
          {t('collage.subtitle')}
        </Text>
      </View>

      <View style={styles.catsWrap}>
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
                    backgroundColor: active ? theme.colors.brand : theme.colors.surface,
                    borderColor: active ? theme.colors.brand : theme.colors.borderStrong,
                  },
                ]}
              >
                <Text variant="bodyStrong" numberOfLines={1} style={{ color: active ? theme.colors.onBrand : theme.colors.text }}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {list.map((tpl, i) => (
          <Animated.View key={tpl.id} entering={FadeIn.delay(Math.min(i, 8) * 40)} style={{ width: colW }}>
            <Pressable
              onPress={() => navigation.navigate('CollageEditor', { templateId: tpl.id })}
              accessibilityRole="button"
              accessibilityLabel={t('collage.layoutA11y').replace('{name}', tpl.name)}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }, theme.elevation(1)]}
            >
              <View style={[styles.thumbBox, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.md }]}>
                <CollageThumb template={tpl} width={colW - 20} />
              </View>
              <View style={styles.cardMeta}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {tpl.name}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {tpl.category} · {tpl.ratio}
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
  catsWrap: { height: 60, justifyContent: 'center' },
  cats: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  chip: {
    height: 40,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { padding: 10, borderWidth: StyleSheet.hairlineWidth },
  thumbBox: { alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'hidden' },
  cardMeta: { marginTop: 10 },
});
