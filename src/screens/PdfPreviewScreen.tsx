import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { Share2 } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { IconButton } from '../components/IconButton';
import { LoadingState } from '../components/LoadingState';
import { sharePdf } from '../services/sharing';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';

export function PdfPreviewScreen({ route, navigation }: RootScreenProps<'PdfPreview'>) {
  const theme = useTheme();
  const { uri, name } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Screen padded={false}>
      <View style={styles.head}>
        <Header
          title={name}
          onBack={() => navigation.goBack()}
          right={
            <IconButton
              icon={Share2}
              onPress={() => sharePdf(uri, name)}
              accessibilityLabel="Share PDF"
            />
          }
        />
      </View>
      <View style={styles.body}>
        {error ? (
          <View style={styles.center}>
            <Text variant="body" color="textSecondary">
              Couldn’t open this PDF.
            </Text>
          </View>
        ) : (
          <>
            <Pdf
              source={{ uri, cache: true }}
              trustAllCerts={false}
              style={[styles.pdf, { backgroundColor: theme.colors.surfaceSunken }]}
              onLoadComplete={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
            {loading ? (
              <View style={styles.overlay}>
                <LoadingState label="Opening PDF…" />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  body: { flex: 1 },
  pdf: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
