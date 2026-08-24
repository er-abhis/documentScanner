import { useEffect } from 'react';
import { Image, StatusBar, StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Full-screen splash shown on launch, then fades out. The image covers the
 * whole screen (edge-to-edge); the dark backdrop matches the artwork so there
 * is no flash on any aspect ratio. `onDone` unmounts it once the fade finishes.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 420 }, finished => {
        if (finished) runOnJS(onDone)();
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [opacity, onDone]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.fill, style]} pointerEvents="none">
      <StatusBar hidden />
      <Image source={require('../assets/splash.png')} style={styles.img} resizeMode="cover" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#040B19', zIndex: 999, elevation: 999 },
  img: { width: '100%', height: '100%' },
});
