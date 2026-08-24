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
  // status
  success: string;
  warning: string;
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
  surfaceAlt: '#F0F2F5',
  surfaceSunken: '#ECEFF3',
  text: '#0B1524',
  textSecondary: '#54637A',
  textTertiary: '#8B97A8',
  textInverse: '#FFFFFF',
  border: '#E5E9F0',
  borderStrong: '#D3DAE4',
  brand: '#2E6BFF',
  brandPressed: '#1E52D6',
  brandSubtle: '#E9F0FF',
  onBrand: '#FFFFFF',
  brandGradient: ['#3B7BFF', '#2455E6'],
  success: '#12A150',
  warning: '#C96A00',
  danger: '#E5484D',
  dangerSubtle: '#FDECEC',
  onDanger: '#FFFFFF',
  overlay: 'rgba(6, 12, 22, 0.45)',
  shadow: '#0B1524',
  skeleton: '#E3E8EF',
  statusBar: 'dark-content',
};

export const darkColors: ColorRoles = {
  background: '#0A0F1A',
  surface: '#131A26',
  surfaceAlt: '#1A2331',
  surfaceSunken: '#0F1622',
  text: '#F2F5F9',
  textSecondary: '#9DAABC',
  textTertiary: '#6C7A8C',
  textInverse: '#0B1524',
  border: '#232E3E',
  borderStrong: '#31404F',
  brand: '#4C86FF',
  brandPressed: '#3B7BFF',
  brandSubtle: '#17233D',
  onBrand: '#FFFFFF',
  brandGradient: ['#4C86FF', '#2E5BFF'],
  success: '#3DD68C',
  warning: '#E8973A',
  danger: '#FF6166',
  dangerSubtle: '#2A1618',
  onDanger: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  skeleton: '#1E2836',
  statusBar: 'light-content',
};
