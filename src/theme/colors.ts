/**
 * Semantic color roles. Screens/components reference roles (e.g. `text`,
 * `surface`, `brand`) — never raw hex. Both palettes share the same keys so
 * every component works in light and dark automatically.
 */
export type ColorRoles = {
  // surfaces (layered, back to front)
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  // text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  // lines / separators
  border: string;
  borderStrong: string;
  // brand
  brand: string;
  brandPressed: string;
  brandSubtle: string;
  onBrand: string;
  brandGradient: [string, string];
  // secondary accent (cyan) — OCR, scanner, info
  accent: string;
  accentSubtle: string;
  // highlight (yellow) — PRO, favorites, stars
  star: string;
  // status
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  onDanger: string;
  // misc
  overlay: string;
  shadow: string;
  skeleton: string;
  statusBar: 'light-content' | 'dark-content';
};

export const lightColors: ColorRoles = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F0FA',
  surfaceSunken: '#ECEBF5',
  text: '#0B1220',
  textSecondary: '#54607A',
  textTertiary: '#8B93AC',
  textInverse: '#FFFFFF',
  border: '#E6E5F0',
  borderStrong: '#D3D2E4',
  brand: '#7B61FF',
  brandPressed: '#6A50E0',
  brandSubtle: '#EFEBFF',
  onBrand: '#FFFFFF',
  brandGradient: ['#7B61FF', '#A855FF'],
  accent: '#0891B2',
  accentSubtle: '#E0F7FB',
  star: '#CA8A04',
  success: '#12A150',
  successSubtle: '#E4F7EC',
  warning: '#C2610A',
  warningSubtle: '#FDEEDF',
  danger: '#E5484D',
  dangerSubtle: '#FDECEC',
  onDanger: '#FFFFFF',
  overlay: 'rgba(6, 12, 22, 0.45)',
  shadow: '#0B1524',
  skeleton: '#E3E8EF',
  statusBar: 'dark-content',
};

/** Premium deep-navy + purple. The app's default theme. */
export const darkColors: ColorRoles = {
  background: '#080F1A',
  surface: '#151A2B',
  surfaceAlt: '#1D2338',
  surfaceSunken: '#0E1422',
  text: '#F8FAFC',
  textSecondary: '#A1A7C2',
  textTertiary: '#6B7396',
  textInverse: '#0B1524',
  border: '#2A3149',
  borderStrong: '#3A4363',
  brand: '#8B78FF',
  brandPressed: '#6A50E0',
  brandSubtle: '#211E42',
  onBrand: '#FFFFFF',
  brandGradient: ['#7B61FF', '#A855FF'],
  accent: '#22D3EE',
  accentSubtle: '#0F2A33',
  star: '#FACC15',
  success: '#34D399',
  successSubtle: '#0F2A22',
  warning: '#FB923C',
  warningSubtle: '#2E1E10',
  danger: '#EF4444',
  dangerSubtle: '#2A1618',
  onDanger: '#FFFFFF',
  overlay: 'rgba(4, 8, 16, 0.62)',
  shadow: '#000000',
  skeleton: '#1A2133',
  statusBar: 'light-content',
};
