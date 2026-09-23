/**
 * Central design tokens. In the real design reference these would be
 * pulled directly from Figma; kept simple here since no design file was
 * attached to this assignment.
 */
export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#FF6B3D',
  primaryDark: '#E4552A',
  text: '#1A1D1F',
  textMuted: '#6F767E',
  border: '#E7E9EC',
  success: '#2FA84F',
  warning: '#E3A008',
  danger: '#E14D4D',
  overlay: 'rgba(0,0,0,0.45)',
  disabled: '#C8CCD1',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radii = { sm: 8, md: 12, lg: 20, pill: 999 };

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
};
