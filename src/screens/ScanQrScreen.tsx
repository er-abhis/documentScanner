import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {
  ArrowLeft,
  CameraOff,
  Flashlight,
  FlashlightOff,
  ScanLine,
} from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Text } from '../components/Text';
import { codeTypeToFormat } from '../services/barcode';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { useT } from '../i18n';
import type { RootScreenProps } from '../types/navigation';

/**
 * Live QR/barcode scanner. react-native-vision-camera's native code scanner
 * gives a real-time viewfinder that auto-detects codes in-frame (no snap, no
 * manual crop). First hit navigates to QrResult, which handles Secret QR,
 * tappable links, copy and share.
 */
export function ScanQrScreen({ navigation }: RootScreenProps<'ScanQr'>) {
  const t = useT();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [asked, setAsked] = useState(false);
  const [torch, setTorch] = useState(false);
  const locked = useRef(false); // fire navigation only once per detection

  useEffect(() => {
    if (!hasPermission) requestPermission().finally(() => setAsked(true));
    else setAsked(true);
  }, [hasPermission, requestPermission]);

  // Re-arm when the screen regains focus (e.g. after "Scan again").
  useEffect(() => {
    if (isFocused) locked.current = false;
  }, [isFocused]);

  const onCodes = useCallback(
    (codes: { value?: string; type: string }[]) => {
      if (locked.current) return;
      const hit = codes.find(c => c.value);
      if (!hit?.value) return;
      locked.current = true;
      haptics.success();
      navigation.replace('QrResult', {
        value: hit.value,
        format: codeTypeToFormat(hit.type),
      });
    },
    [navigation],
  );

  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'code-128',
      'code-39',
      'code-93',
      'codabar',
      'itf',
      'upc-e',
      'data-matrix',
      'aztec',
      'pdf-417',
    ],
    onCodeScanned: onCodes,
  });

  // Permission still resolving.
  if (!asked) {
    return (
      <Screen center>
        <LoadingState label={t('qr.opening')} />
      </Screen>
    );
  }

  if (!hasPermission) {
    return (
      <Screen>
        <Header title={t('qr.scanTitle')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon={CameraOff}
          title={t('qr.deniedTitle')}
          subtitle={t('qr.deniedSub')}
          actionLabel={t('qr.openSettings')}
          onAction={() => Linking.openSettings()}
        />
      </Screen>
    );
  }

  if (!device) {
    return (
      <Screen>
        <Header title={t('qr.scanTitle')} onBack={() => navigation.goBack()} />
        <EmptyState icon={CameraOff} title={t('qr.scanError')} subtitle={t('qr.noCamera')} />
      </Screen>
    );
  }

  return (
    <View style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        codeScanner={codeScanner}
        torch={torch ? 'on' : 'off'}
      />

      {/* Framing overlay + controls */}
      <SafeAreaView style={styles.fill} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: theme.colors.overlay }]}
          >
            <ArrowLeft size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setTorch(v => !v)}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: theme.colors.overlay }]}
          >
            {torch ? <Flashlight size={22} color="#fff" /> : <FlashlightOff size={22} color="#fff" />}
          </Pressable>
        </View>

        <View style={styles.centerArea} pointerEvents="none">
          <View style={[styles.reticle, { borderColor: theme.colors.brand }]}>
            <ScanLine size={40} color={theme.colors.brand} />
          </View>
          <Text variant="body" style={styles.hint}>
            {t('qr.scanHint')}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { color: '#fff', textAlign: 'center', paddingHorizontal: 32 },
  bottomSpacer: { height: 48 },
});
