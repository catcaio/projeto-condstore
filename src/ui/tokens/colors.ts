export const colors = {
  accent: {
    blue: '#0A84FF',
    blueStrong: '#0066CC',
    red: '#FF3B30',
    black: '#111113',
    white: 'var(--bg-app)FFF',
  },
  neutral: {
    0: 'var(--bg-app)FFF',
    25: '#FAFAFC',
    50: '#F2F3F7',
    100: '#E7E9EE',
    200: '#D3D7E0',
    300: '#B5BDCB',
    400: '#8892A4',
    500: '#606A7A',
    700: '#2A303A',
    900: '#111318',
  },
  semantic: {
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    card: 'hsl(var(--card))',
    cardForeground: 'hsl(var(--card-foreground))',
    muted: 'hsl(var(--muted))',
    mutedForeground: 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
    ring: 'hsl(var(--ring))',
    primary: 'hsl(var(--primary))',
    destructive: 'hsl(var(--destructive))',
  },
} as const;

export type ColorTokens = typeof colors;
