import type { TextStyle } from 'react-native';

export const palette = {
  forestDeep: '#063A2F',
  forest: '#0F5B45',
  forestDark: '#052A23',
  moss: '#73905C',
  acidLime: '#C6DC39',
  warmIvory: '#F2EFE6',
  paper: '#F8F6F0',
  paperStrong: '#FBF9F3',
  ink: '#181F1C',
  muted: '#62716B',
  line: '#7C8983',
  lineSoft: '#C4CBC6',
  red: '#C24B44',
  amber: '#D09A2E',
  green: '#3F7E55',
  white: '#FFFDF7',
  overlay: 'rgba(3, 24, 20, 0.72)',
} as const;

export const fonts = {
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
  technical: 'IBMPlexMono_500Medium',
  technicalBold: 'IBMPlexMono_600SemiBold',
} as const;

export const radii = {
  panel: 10,
  control: 7,
  stamp: 3,
} as const;

export const technicalText: TextStyle = {
  fontFamily: fonts.technicalBold,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};
