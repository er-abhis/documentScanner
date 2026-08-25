import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Returns false while the screen's push/replace transition is animating, then
 * true once it finishes. Heavy screens (Skia grids, WebViews) render a light
 * placeholder first and mount their expensive tree afterward, so the transition
 * itself stays at 60fps instead of janking while the heavy view constructs on
 * the same frame. A fallback timer covers cases with no animation (initial
 * route, or platforms that don't emit transitionEnd).
 */
export function useDeferredMount(): boolean {
  const navigation = useNavigation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // 'transitionEnd' is a native-stack event not in the base navigation type.
    const unsub = (navigation as any).addListener('transitionEnd', (e: any) => {
      if (!e?.data?.closing) setReady(true);
    });
    const fallback = setTimeout(() => setReady(true), 350);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [navigation]);
  return ready;
}
