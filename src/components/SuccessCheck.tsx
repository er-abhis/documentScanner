import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

/** Small spring-in success check — plays once on mount. UI-thread animated. */
export function SuccessCheck({ size = 22 }: { size?: number }) {
  const theme = useTheme();
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: theme.motion.duration.base });
  }, [scale, opacity, theme.motion.duration.base]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style}>
      <CheckCircle2 size={size} color={theme.colors.success} />
    </Animated.View>
  );
}
