import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'On-device processing',
    body: 'Scanning, editing, OCR, PDF generation and every other feature run entirely on your device. Your documents and images never leave your phone.',
  },
  {
    title: 'No account, no tracking',
    body: 'The app has no sign-in, no analytics SDKs, no advertising and no third-party trackers. We do not collect, store or sell any personal data.',
  },
  {
    title: 'No internet required',
    body: 'Core functionality works fully offline. The only optional network actions are ones you trigger yourself — opening a share sheet, a support link, or checking Google Play for an app update.',
  },
  {
    title: 'Permissions',
    body: 'Camera is used only while you scan. The photo picker uses the system picker, so the app only sees the images you select. Files you save stay in the app’s private storage until you share or export them.',
  },
  {
    title: 'Your data, your control',
    body: 'Documents are stored locally and can be deleted at any time from the Documents screen. Uninstalling the app removes everything it created.',
  },
  {
    title: 'Contact',
    body: 'Questions about privacy? Reach out via the developer’s LinkedIn on the “About the developer” page.',
  },
];

export function PrivacyScreen({ navigation }: RootScreenProps<'Privacy'>) {
  const theme = useTheme();
  return (
    <Screen scroll>
      <Header title="Privacy Policy" onBack={() => navigation.goBack()} />
      <Text variant="caption" color="textTertiary" style={styles.updated}>
        Local-first · your documents stay on your device
      </Text>
      {SECTIONS.map(s => (
        <View key={s.title} style={styles.section}>
          <Text variant="bodyStrong" style={styles.h}>{s.title}</Text>
          <Text variant="callout" color="textSecondary" style={styles.body}>{s.body}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  updated: { marginTop: 8, marginBottom: 16 },
  section: { marginBottom: 20 },
  h: { marginBottom: 6 },
  body: { lineHeight: 21 },
});
