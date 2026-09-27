import { useColorScheme } from 'react-native';

/** Mirrors the web app's orange / black / white tokens (apps/web/app/globals.css). */
const dark = {
  bg: '#080808',
  surface: '#171717',
  raised: '#202020',
  field: '#101010',
  line: '#333333',
  lineStrong: '#4a4a4a',
  text: '#ffffff',
  muted: '#c4c4c4',
  subtle: '#a0a0a0',
  faint: '#7a7a7a',
  accent: '#ff8a3d',
  accentStrong: '#ea580c',
  accentSoft: '#ffbd8a',
  onAccent: '#ffffff',
  danger: '#ff6b6b',
  track: '#383838',
};

const light: typeof dark = {
  bg: '#ffffff',
  surface: '#f6f6f6',
  raised: '#ededed',
  field: '#fcfcfc',
  line: '#d7d7d7',
  lineStrong: '#b5b5b5',
  text: '#111111',
  muted: '#3a3a3a',
  subtle: '#5c5c5c',
  faint: '#767676',
  accent: '#c2410c',
  accentStrong: '#c2410c',
  accentSoft: '#b54708',
  onAccent: '#ffffff',
  danger: '#b42318',
  track: '#d0d0d0',
};

export type Palette = typeof dark;

export function usePalette(): Palette {
  return useColorScheme() === 'light' ? light : dark;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
