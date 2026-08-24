import { Platform, type TextStyle } from 'react-native';

/** System font — SF on iOS, Roboto on Android. Premium without a font dep. */
const family = Platform.select({ ios: undefined, default: undefined });

export type TypeVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'caption'
  | 'label';

export const typography: Record<TypeVariant, TextStyle> = {
  display: { fontFamily: family, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  h1: { fontFamily: family, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  h2: { fontFamily: family, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  title: { fontFamily: family, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontFamily: family, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontFamily: family, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  callout: { fontFamily: family, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontFamily: family, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontFamily: family, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.4 },
};
