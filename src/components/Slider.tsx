import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '../theme';

type Props = {
  label: string;
  /** current value */
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
};

const THUMB = 24;

/** Minimal UI-thread slider built on gesture-handler (no native slider dep). */
export function Slider({ label, value, min = -1, max = 1, onChange }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const startX = useSharedValue(0);

  const usable = Math.max(1, width - THUMB);
  // keep thumb in sync when width/value known
  if (width > 0) {
    x.value = ((value - min) / (max - min)) * usable;
  }

  const emit = (px: number) => {
    const v = min + (px / usable) * (max - min);
    onChange(Math.round(v * 100) / 100);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
    })
    .onUpdate(e => {
      const nx = Math.min(Math.max(startX.value + e.translationX, 0), usable);
      x.value = nx;
      runOnJS(emit)(nx);
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text variant="callout" color="textSecondary">
          {label}
        </Text>
        <Text variant="callout" color="textSecondary">
          {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onLayout}>
          <View style={[styles.rail, { backgroundColor: theme.colors.surfaceSunken }]} />
          <Animated.View
            style={[styles.fill, fillStyle, { backgroundColor: theme.colors.brand }]}
          />
          <Animated.View
            style={[
              styles.thumb,
              thumbStyle,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.brand },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  track: { height: THUMB, justifyContent: 'center' },
  rail: { height: 4, borderRadius: 2, width: '100%' },
  fill: { position: 'absolute', left: 0, height: 4, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
});
