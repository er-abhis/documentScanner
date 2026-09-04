import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronRight, Info, ShieldCheck, Share2, Star, RefreshCw, DownloadCloud,
  Palette, Languages, Coffee, User, Sparkles, BookOpen,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Text } from '../components/Text';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/Dialog';
import { useTheme } from '../theme';
import { useThemePref } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { haptics } from '../lib/haptics';
import { rateApp, shareApp } from '../services/sharing';
import { getPrefs, setPref } from '../services/prefs';
import { checkForUpdate, startFlexibleUpdate, installFlexibleUpdate } from '../services/update';
import type { ThemePref, LangPref } from '../services/prefs';
import type { RootScreenProps } from '../types/navigation';

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const theme = useTheme();
  const { preference, setPreference } = useThemePref();
  const { lang, setLang, t } = useI18n();
  const toast = useToast();
  const dialog = useDialog();
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [checking, setChecking] = useState(false);

  useFocusEffect(useCallback(() => { getPrefs().then(p => setAutoUpdate(p.autoUpdate)); }, []));

  const toggleAuto = (v: boolean) => { setAutoUpdate(v); setPref('autoUpdate', v); };

  const checkNow = async () => {
    setChecking(true);
    const has = await checkForUpdate();
    setChecking(false);
    if (has) {
      const ok = await dialog.confirm({ title: 'Update available', message: 'A new version is available. Download it now?', confirmText: 'Update', cancelText: 'Later' });
      if (ok) startFlexibleUpdate(() => installFlexibleUpdate()).catch(() => {});
    } else {
      toast({ variant: 'info', message: 'You have the latest version.' });
    }
  };

  const themeOpts: { key: ThemePref; label: string }[] = [
    { key: 'system', label: t('settings.system') },
    { key: 'light', label: t('settings.light') },
    { key: 'dark', label: t('settings.dark') },
  ];
  const langOpts: { key: LangPref; label: string }[] = [
    { key: 'en', label: 'English' },
    { key: 'hi', label: 'हिंदी' },
  ];

  return (
    <Screen scroll>
      <Header title={t('settings.title')} />

      <Card style={styles.group}>
        <View style={styles.selRow}>
          <Palette size={theme.iconSize.md} color={theme.colors.textSecondary} />
          <Text variant="body" style={styles.selLabel}>{t('settings.appearance')}</Text>
        </View>
        <Segmented options={themeOpts} value={preference} onChange={k => { haptics.light(); setPreference(k); }} />
        <View style={[styles.selRow, styles.selRowTop, { borderTopColor: theme.colors.border }]}>
          <Languages size={theme.iconSize.md} color={theme.colors.textSecondary} />
          <Text variant="body" style={styles.selLabel}>{t('settings.language')}</Text>
        </View>
        <Segmented options={langOpts} value={lang} onChange={k => { haptics.light(); setLang(k); }} />
      </Card>

      <Card style={styles.group}>
        <Row icon={ShieldCheck} label={t('settings.processing')} value={t('settings.onDevice')} />
        <Row icon={Info} label={t('settings.version')} value="1.0.0" last />
      </Card>

      <Card style={styles.group}>
        <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
          <DownloadCloud size={theme.iconSize.md} color={theme.colors.textSecondary} />
          <View style={styles.switchLabel}>
            <Text variant="body">{t('settings.autoUpdate')}</Text>
            <Text variant="caption" color="textSecondary">{t('settings.autoUpdateSub')}</Text>
          </View>
          <Switch value={autoUpdate} onValueChange={toggleAuto} trackColor={{ true: theme.colors.brand }} />
        </View>
        <Row icon={RefreshCw} label={checking ? t('settings.checking') : t('settings.checkUpdates')} onPress={checking ? undefined : checkNow} last />
      </Card>

      <Card style={styles.group}>
        <Row icon={BookOpen} label={t('settings.appGuide')} onPress={() => navigation.navigate('AppGuide')} />
        <Row icon={Sparkles} label={t('settings.featuresFaq')} onPress={() => navigation.navigate('Faq')} />
        <Row icon={Coffee} label={t('settings.support')} onPress={() => navigation.navigate('Coffee')} />
        <Row icon={User} label={t('settings.about')} onPress={() => navigation.navigate('About')} />
        <Row icon={ShieldCheck} label={t('settings.privacy')} onPress={() => navigation.navigate('Privacy')} last />
      </Card>

      <Card style={styles.group}>
        <Row icon={Share2} label={t('settings.shareApp')} onPress={shareApp} />
        <Row icon={Star} label={t('settings.rateApp')} onPress={rateApp} last />
      </Card>
    </Screen>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
      {options.map(o => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, { borderRadius: theme.radius.sm }, active && { backgroundColor: theme.colors.surface, ...theme.elevation(1) }]}>
            <Text variant="callout" color={active ? 'brand' : 'textSecondary'}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ icon: Icon, label, value, last, onPress }: { icon: LucideIcon; label: string; value?: string; last?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
      <Icon size={theme.iconSize.md} color={theme.colors.textSecondary} />
      <Text variant="body" style={styles.rowLabel}>{label}</Text>
      {value != null ? (
        <Text variant="callout" color="textSecondary">{value}</Text>
      ) : (
        <ChevronRight size={theme.iconSize.md} color={theme.colors.textTertiary} />
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} android_ripple={{ color: theme.colors.border }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowLabel: { flex: 1, marginLeft: 14 },
  switchLabel: { flex: 1, marginLeft: 14 },
  selRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingBottom: 10 },
  selRowTop: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 16 },
  selLabel: { marginLeft: 14 },
  seg: { flexDirection: 'row', padding: 4, marginBottom: 6 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center' },
});
