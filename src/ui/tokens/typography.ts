export const typography = {
  fontFamily: {
    ui: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`,
    mono: `"SF Mono", ui-monospace, Menlo, Consolas, monospace`,
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export type TypographyTokens = typeof typography;
