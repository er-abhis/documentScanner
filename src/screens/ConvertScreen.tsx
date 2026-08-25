import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View, LayoutAnimation, Modal, ScrollView } from 'react-native';
import { ImagePlus, Share2, Save, RefreshCw, Trash2, ArrowRight } from 'lucide-react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { IconButton } from '../components/IconButton';
import { pickImages } from '../services/gallery';
import { saveToGallery } from '../services/gallery/save';
import { type ImgFormat } from '../services/image/encode';
import { processToFile, type ResizeRatio } from '../services/image/resize';
import { shareFiles } from '../services/sharing';
import { haptics } from '../lib/haptics';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import type { RootScreenProps } from '../types/navigation';
import RNFS from 'react-native-fs';

const FORMATS: { key: ImgFormat; label: string }[] = [
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
  { key: 'webp', label: 'WEBP' },
];

const RATIO_AR: Record<Exclude<ResizeRatio, 'original'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

const MIME: Record<ImgFormat, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

interface ImageMetadata {
  uri: string;
  name: string;
  size: number;
  w: number;
  h: number;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

async function copyToLocalCache(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const filename = `temp_conv_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.copyFile(uri, destPath);
    return `file://${destPath}`;
  }
  return uri;
}

const estimateSize = (origSize: number, origW: number, origH: number, newW: number, newH: number, targetFmt: string, q: number) => {
  const origArea = origW * origH || 1;
  const newArea = newW * newH;
  const areaRatio = newArea / origArea;
  
  let formatFactor = 1.0;
  if (targetFmt === 'png') formatFactor = 1.8;
  else if (targetFmt === 'webp') formatFactor = 0.65;
  else formatFactor = 0.85; // jpg
  
  const qualityFactor = targetFmt === 'png' ? 1.0 : q;
  
  const estimated = origSize * areaRatio * qualityFactor * formatFactor;
  return Math.max(1024, Math.round(estimated));
};

export function ConvertScreen({ navigation }: RootScreenProps<'Convert'>) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const [sources, setSources] = useState<string[]>([]);
  const [metadataList, setMetadataList] = useState<ImageMetadata[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [format, setFormat] = useState<ImgFormat>('jpg');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  const [ratio, setRatio] = useState<ResizeRatio>('original');
  const [progress, setProgress] = useState<number | null>(null);
  
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'share'>('save');

  const resolveMetadata = async (uris: string[]): Promise<ImageMetadata[]> => {
    const resolvedList: ImageMetadata[] = [];
    for (const uri of uris) {
      let localPath = uri;
      let isTemp = false;
      if (uri.startsWith('content://')) {
        try {
          localPath = await copyToLocalCache(uri);
          isTemp = true;
        } catch (e) {
          console.warn('Failed to copy content URI:', e);
        }
      }
      
      try {
        const cleanPath = localPath.replace('file://', '');
        const stat = await RNFS.stat(cleanPath);
        const name = uri.split('/').pop() || 'image.jpg';
        
        await new Promise<void>((resolve) => {
          Image.getSize(localPath, (w, h) => {
            resolvedList.push({
              uri,
              name,
              size: stat.size,
              w,
              h
            });
            resolve();
          }, () => {
            resolvedList.push({
              uri,
              name,
              size: stat.size,
              w: 0,
              h: 0
            });
            resolve();
          });
        });
      } catch (e) {
        console.warn('Failed to stat file:', e);
      } finally {
        if (isTemp) {
          try {
            await RNFS.unlink(localPath.replace('file://', ''));
          } catch {}
        }
      }
    }
    return resolvedList;
  };

  const pick = async () => {
    const uris = await pickImages();
    if (uris.length) {
      setProgress(0);
      try {
        const newMetaList = await resolveMetadata(uris);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSources(prev => [...prev, ...uris]);
        setMetadataList(prev => [...prev, ...newMetaList]);
      } catch (e) {
        console.warn('Pick error:', e);
      } finally {
        setProgress(null);
      }
    }
  };

  const clearAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSources([]);
    setMetadataList([]);
    setActiveIndex(0);
  };

  const removeImage = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSources(prev => prev.filter((_, i) => i !== index));
    setMetadataList(prev => prev.filter((_, i) => i !== index));
    if (activeIndex >= sources.length - 1) {
      setActiveIndex(Math.max(0, sources.length - 2));
    }
  };

  const convertAll = async (): Promise<string[]> => {
    const out: string[] = [];
    const tempsToDelete: string[] = [];
    try {
      for (let i = 0; i < sources.length; i++) {
        setProgress(Math.round(((i + 1) / sources.length) * 100));
        let path = sources[i];
        if (path.startsWith('content://')) {
          path = await copyToLocalCache(path);
          tempsToDelete.push(path.replace('file://', ''));
        }
        const resized = await processToFile(path, {
          scale,
          ratio,
          format,
          quality: Math.round(quality * 100)
        });
        out.push(resized);
      }
    } finally {
      for (const temp of tempsToDelete) {
        try {
          await RNFS.unlink(temp);
        } catch {}
      }
    }
    return out;
  };

  const executeSave = async () => {
    setProgress(0);
    try {
      const files = await convertAll();
      for (const f of files) await saveToGallery(f);
      setProgress(null);
      haptics.success();
      const n = files.length;
      const fmt = format.toUpperCase();
      Alert.alert(
        t('convert.savedTitle'),
        lang === 'hi'
          ? `${n} ${fmt} इमेज आपकी गैलरी में सहेजी गईं।`
          : `${n} ${fmt} image${n === 1 ? '' : 's'} saved to your gallery.`,
      );
    } catch (e) {
      console.warn('Save failed:', e);
      setProgress(null);
      Alert.alert(t('convert.saveFailTitle'), t('convert.saveFailMsg'));
    }
  };

  const executeShare = async () => {
    setProgress(0);
    try {
      const files = await convertAll();
      setProgress(null);
      await shareFiles(files, MIME[format]);
    } catch (e) {
      console.warn('Share failed:', e);
      setProgress(null);
      Alert.alert(t('convert.failTitle'), t('convert.tryAgain'));
    }
  };

  const handleSaveClick = () => {
    if (sources.length === 0) return;
    setActionType('save');
    setConfirmVisible(true);
  };

  const handleShareClick = () => {
    if (sources.length === 0) return;
    setActionType('share');
    setConfirmVisible(true);
  };

  // Dynamic values computation for current active image
  const activeUri = sources[activeIndex];
  const activeMeta = metadataList[activeIndex];

  let expW = 0;
  let expH = 0;
  if (activeMeta) {
    const iw = activeMeta.w;
    const ih = activeMeta.h;
    
    let cropW = iw;
    let cropH = ih;
    if (ratio !== 'original') {
      const ar = RATIO_AR[ratio];
      const srcAr = iw / ih;
      if (srcAr > ar) {
        cropW = ih * ar;
        cropH = ih;
      } else {
        cropW = iw;
        cropH = iw / ar;
      }
    }
    
    expW = Math.max(1, Math.round(cropW * scale));
    expH = Math.max(1, Math.round(cropH * scale));
  }

  const expSize = activeMeta 
    ? estimateSize(activeMeta.size, activeMeta.w, activeMeta.h, expW, expH, format, quality)
    : 0;

  const containerAspectRatio = ratio === 'original' 
    ? (activeMeta && activeMeta.w && activeMeta.h ? activeMeta.w / activeMeta.h : 4 / 3)
    : RATIO_AR[ratio];

  if (progress !== null) {
    return (
      <Screen center>
        <LoadingState label={`${t('convert.converting')} ${progress}%`} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.head}>
        <Header 
          title={t('convert.title')} 
          onBack={() => navigation.goBack()} 
          right={sources.length > 0 ? <IconButton icon={Trash2} onPress={clearAll} /> : undefined}
        />
      </View>

      {sources.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title={t('convert.emptyTitle')}
          subtitle={t('convert.emptySub')}
          actionLabel={t('convert.selectImages')}
          actionIcon={ImagePlus}
          onAction={pick}
        />
      ) : (
        <View style={styles.flex1}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Multi-image thumbnails header */}
            {sources.length > 1 && (
              <View style={styles.thumbStrip}>
                <FlatList
                  horizontal
                  data={sources}
                  keyExtractor={(u, i) => `${u}-${i}`}
                  contentContainerStyle={styles.thumbList}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item, index }) => {
                    const active = index === activeIndex;
                    return (
                      <View style={styles.thumbWrapper}>
                        <Pressable
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setActiveIndex(index);
                          }}
                          style={[
                            styles.thumbBox,
                            {
                              borderColor: active ? theme.colors.brand : theme.colors.border,
                              borderWidth: active ? 2 : 1,
                              borderRadius: theme.radius.sm,
                            }
                          ]}
                        >
                          <Image source={{ uri: item }} style={styles.smallThumb} />
                        </Pressable>
                        <Pressable
                          onPress={() => removeImage(index)}
                          style={[styles.deleteBadge, { backgroundColor: theme.colors.error }]}
                        >
                          <Text style={styles.deleteBadgeText}>×</Text>
                        </Pressable>
                      </View>
                    );
                  }}
                />
              </View>
            )}

            {/* Dynamic shape preview frame */}
            <View style={[styles.previewFrame, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.lg, borderColor: theme.colors.border }]}>
              <View style={[styles.previewContainer, { aspectRatio: containerAspectRatio }]}>
                {activeUri && (
                  <Image 
                    source={{ uri: activeUri }} 
                    style={styles.previewImage} 
                    resizeMode={ratio === 'original' ? 'contain' : 'cover'} 
                  />
                )}
              </View>
            </View>

            {/* Dimensions and conversion details card */}
            {activeMeta && (
              <View style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, borderColor: theme.colors.border }]}>
                <View style={styles.detailCardRow}>
                  <View style={styles.detailItem}>
                    <Text variant="caption" color="textSecondary">
                      {lang === 'hi' ? 'मूल फ़ाइल' : 'Original file'}
                    </Text>
                    <Text variant="body" numberOfLines={1} style={styles.fileName}>
                      {activeMeta.name}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {activeMeta.w} × {activeMeta.h} · {formatSize(activeMeta.size)}
                    </Text>
                  </View>

                  <View style={styles.arrowCol}>
                    <ArrowRight size={16} color={theme.colors.textSecondary} />
                  </View>

                  <View style={styles.detailItem}>
                    <Text variant="caption" color="brand">
                      {lang === 'hi' ? 'संभावित आउटपुट' : 'Expected output'}
                    </Text>
                    <Text variant="body" numberOfLines={1} style={[styles.fileName, { color: theme.colors.brand }]}>
                      {activeMeta.name.replace(/\.[^/.]+$/, "")}.{format}
                    </Text>
                    <Text variant="caption" style={{ color: theme.colors.brand, fontWeight: 'bold' }}>
                      {expW} × {expH} · ~{formatSize(expSize)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Options configuration sheet */}
            <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Format selection */}
              <Text variant="callout" style={styles.sectionTitle}>
                {lang === 'hi' ? 'आउटपुट फ़ॉर्मेट' : 'Output Format'}
              </Text>
              <View style={styles.chips}>
                {FORMATS.map(f => {
                  const on = f.key === format;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setFormat(f.key);
                      }}
                      style={[styles.chip, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                    >
                      <Text variant="callout" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Crop Ratio selection */}
              <Text variant="callout" style={styles.sectionTitle}>
                {t('convert.resize')} (Aspect Ratio)
              </Text>
              <View style={styles.chips}>
                {(['original', '1:1', '4:3', '3:4', '16:9', '9:16'] as ResizeRatio[]).map(r => {
                  const on = r === ratio;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setRatio(r);
                      }}
                      style={[styles.chipSm, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                    >
                      <Text variant="caption" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>
                        {r === 'original' ? t('convert.original') : r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Predefined Scale selectors */}
              <Text variant="callout" style={styles.sectionTitle}>
                {lang === 'hi' ? 'त्वरित स्केल' : 'Quick Scale'}
              </Text>
              <View style={styles.chips}>
                {[0.25, 0.5, 0.75, 1].map(p => {
                  const on = Math.abs(scale - p) < 0.001;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setScale(p);
                      }}
                      style={[styles.chipSm, { backgroundColor: on ? theme.colors.brand : theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}
                    >
                      <Text variant="caption" style={{ color: on ? theme.colors.onBrand : theme.colors.textSecondary }}>
                        {Math.round(p * 100)}%
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Scale slider */}
              <Slider label={t('convert.scale')} value={scale} min={0.1} max={1} onChange={(v) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setScale(v);
              }} format={v => `${Math.round(v * 100)}%`} />

              {/* Quality slider (if not lossless PNG) */}
              {format !== 'png' && (
                <Slider label={t('convert.quality')} value={quality} min={0.3} max={1} onChange={setQuality} format={v => `${Math.round(v * 100)}%`} />
              )}
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={[styles.bottomActions, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Button title={t('common.add')} icon={ImagePlus} variant="secondary" style={styles.flex1} onPress={pick} />
            <Button title={t('common.save')} icon={Save} variant="secondary" style={[styles.flex1, styles.gap]} onPress={handleSaveClick} />
            <Button title={t('common.share')} icon={Share2} style={[styles.flex1, styles.gap]} onPress={handleShareClick} />
          </View>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalDragHandle, { backgroundColor: theme.colors.border }]} />
            <Text variant="headline" style={styles.modalTitle}>
              {lang === 'hi' ? 'परिवर्तन की पुष्टि करें' : 'Confirm Export'}
            </Text>
            
            <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text variant="caption" color="textSecondary">{lang === 'hi' ? 'कुल इमेज' : 'Total Images'}</Text>
                <Text variant="body">{sources.length}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="caption" color="textSecondary">{lang === 'hi' ? 'आउटपुट फ़ॉर्मेट' : 'Output Format'}</Text>
                <Text variant="body" style={{ fontWeight: 'bold' }}>{format.toUpperCase()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="caption" color="textSecondary">{lang === 'hi' ? 'नया आकार' : 'Resized Dimensions'}</Text>
                <Text variant="body">{expW} × {expH} px</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="caption" color="textSecondary">{lang === 'hi' ? 'अनुमानित कुल साइज' : 'Estimated Total Size'}</Text>
                <Text variant="body">{formatSize(expSize * sources.length)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="caption" color="textSecondary">{lang === 'hi' ? 'गुणवत्ता' : 'Compression Quality'}</Text>
                <Text variant="body">{format === 'png' ? '100% (Lossless)' : `${Math.round(quality * 100)}%`}</Text>
              </View>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.modalActions}>
              <Button 
                title={t('common.cancel')} 
                variant="secondary" 
                style={styles.modalBtn} 
                onPress={() => setConfirmVisible(false)} 
              />
              <Button 
                title={actionType === 'save' ? (lang === 'hi' ? 'गैलरी में सहेजें' : 'Save to Gallery') : (lang === 'hi' ? 'शेयर करें' : 'Share Now')} 
                style={[styles.modalBtn, { marginLeft: 12 }]} 
                onPress={() => {
                  setConfirmVisible(false);
                  setTimeout(actionType === 'save' ? executeSave : executeShare, 250);
                }} 
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20 },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  gap: { marginLeft: 10 },
  
  // Thumbnail list
  thumbStrip: { height: 74, marginBottom: 12 },
  thumbList: { paddingVertical: 4 },
  thumbWrapper: { position: 'relative', marginRight: 10 },
  thumbBox: { width: 56, height: 56, overflow: 'hidden', backgroundColor: '#00000008' },
  smallThumb: { width: '100%', height: '100%' },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', lineHeight: 14 },

  // Preview Frame and Aspect ratio box
  previewFrame: {
    height: 300,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  previewContainer: {
    height: '100%',
    maxHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  // Details card
  detailsCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  arrowCol: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Options Panel
  panel: {
    paddingVertical: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 18, paddingVertical: 8 },
  chipSm: { paddingHorizontal: 12, paddingVertical: 6 },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  modalDetails: {
    marginVertical: 8,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
  },
});
