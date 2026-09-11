import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import { AlphaType, ColorType, useImage } from '@shopify/react-native-skia';
import { Copy, ImagePlus, Pipette } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import Clipboard from '@react-native-clipboard/clipboard';
import { useToast } from '../components/Toast';
import { pickImages } from '../services/gallery';
import { haptics } from '../lib/haptics';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const hex2 = (n: number) => n.toString(16).padStart(2, '0');

type Picked = { hex: string; r: number; g: number; b: number; x: number; y: number };

export function ColorPickerScreen({ navigation }: RootScreenProps<'ColorPicker'>) {
  const theme = useTheme();
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const toast = useToast();

  const [uri, setUri] = useState<string | null>(null);
  const [boxW, setBoxW] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);

  const image = useImage(uri);
  const dims = useMemo(() => (image ? { w: image.width(), h: image.height() } : null), [image]);
  const boxH = dims && boxW ? (boxW * dims.h) / dims.w : 0;

  const pick = async () => {
    const [p] = await pickImages(1);
    if (p) { setUri(p); setPicked(null); }
  };

  const onLayout = (e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width);

  const sample = (e: GestureResponderEvent) => {
    if (!image || !dims || !boxW || !boxH) return;
    const { locationX, locationY } = e.nativeEvent;
    const nx = Math.max(0, Math.min(0.999, locationX / boxW));
    const ny = Math.max(0, Math.min(0.999, locationY / boxH));
    const px = Math.floor(nx * dims.w);
    const py = Math.floor(ny * dims.h);
    const buf = image.readPixels(px, py, {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!buf) return;
    const r = buf[0], g = buf[1], b = buf[2];
    haptics.light();
    setPicked({ hex: `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase(), r, g, b, x: locationX, y: locationY });
  };

  const copy = () => {
    if (!picked) return;
    Clipboard.setString(picked.hex);
    haptics.success();
    toast({ variant: 'success', message: hi ? `${picked.hex} कॉपी किया गया` : `Copied ${picked.hex}` });
  };

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.head}>
        <Header title={hi ? 'कलर पिकर' : 'Color Picker'} onBack={() => navigation.goBack()} />
      </View>

      {!uri ? (
        <EmptyState
          icon={Pipette}
          title={hi ? 'रंग चुनें' : 'Pick a colour'}
          subtitle={hi ? 'फ़ोटो चुनें, फिर किसी भी जगह टैप करें।' : 'Pick a photo, then tap anywhere to sample.'}
          actionLabel={hi ? 'फ़ोटो चुनें' : 'Select photo'}
          actionIcon={ImagePlus}
          onAction={pick}
        />
      ) : (
        <View style={styles.flex1}>
          <View style={styles.body}>
            <Pressable onPress={sample} onLayout={onLayout} style={[styles.imgWrap, { height: boxH || undefined, backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.md }]}>
              <Image source={{ uri }} style={styles.img} resizeMode="cover" />
              {picked && (
                <View pointerEvents="none" style={[styles.cross, { left: picked.x - 12, top: picked.y - 12, borderColor: '#FFFFFF' }]}>
                  <View style={[styles.crossDot, { backgroundColor: picked.hex }]} />
                </View>
              )}
            </Pressable>
            {!picked && (
              <Text variant="caption" color="textSecondary" style={styles.hint}>
                {hi ? 'रंग सैंपल करने के लिए इमेज पर टैप करें' : 'Tap the image to sample a colour'}
              </Text>
            )}
          </View>

          {picked && (
            <View style={[styles.result, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
              <View style={[styles.bigSwatch, { backgroundColor: picked.hex, borderColor: theme.colors.border }]} />
              <View style={styles.flex1}>
                <Text variant="title">{picked.hex}</Text>
                <Text variant="caption" color="textSecondary">rgb({picked.r}, {picked.g}, {picked.b})</Text>
              </View>
              <Button title={hi ? 'कॉपी' : 'Copy'} icon={Copy} fullWidth={false} onPress={copy} />
            </View>
          )}

          <View style={[styles.actions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Button title={hi ? 'बदलें' : 'Change photo'} icon={ImagePlus} variant="secondary" onPress={pick} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  flex1: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  imgWrap: { width: '100%', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  cross: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  crossDot: { width: 12, height: 12, borderRadius: 6 },
  hint: { textAlign: 'center', marginTop: 12 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  bigSwatch: { width: 52, height: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  actions: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
