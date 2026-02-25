export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(16, 24, 40, 0.04)',
  md: '0 8px 24px rgba(16, 24, 40, 0.06)',
  lg: '0 20px 48px rgba(16, 24, 40, 0.10)',
  insetBorder: 'inset 0 0 0 1px rgba(17, 24, 39, 0.04)',
} as const;

export type ShadowToken = keyof typeof shadows;
