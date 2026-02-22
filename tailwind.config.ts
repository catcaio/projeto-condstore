import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './ui/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic':
                    'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                // PREMIUM SAAS TOKENS
                surface: {
                    base: 'hsl(var(--surface-base))',
                    card: 'hsl(var(--surface-card))',
                    elevated: 'hsl(var(--surface-elevated))',
                },
                edge: {
                    subtle: 'hsl(var(--border-subtle))',
                    focus: 'hsl(var(--border-focus))',
                },
                ink: {
                    hero: 'hsl(var(--text-hero))',
                    body: 'hsl(var(--text-body))',
                    muted: 'hsl(var(--text-muted))',
                },
                brand: {
                    primary: 'hsl(var(--brand-primary))',
                    premium: 'hsl(var(--brand-premium))',
                },
                success: {
                    base: 'hsl(var(--success-base))',
                }
            },
            spacing: {
                '3xs': 'var(--space-3xs)',
                '2xs': 'var(--space-2xs)',
                'xs': 'var(--space-xs)',
                'sm': 'var(--space-sm)',
                'md': 'var(--space-md)',
                'lg': 'var(--space-lg)',
                'xl': 'var(--space-xl)',
            },
            fontSize: {
                'body-sm': ['14px', '20px'],
                'body-md': ['16px', '24px'],
                'body-lg': ['18px', '28px'],
                'heading-sm': ['29px', '36px'],
                'heading-hero': ['47px', '52px'],
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                'token-sm': 'var(--radius-sm)',
                'token-md': 'var(--radius-md)',
                'token-lg': 'var(--radius-lg)',
                'token-pill': 'var(--radius-pill)',
            },
            boxShadow: {
                'token-1': 'var(--elevation-1)',
                'token-glow': 'var(--elevation-glow)',
            },
            transitionTimingFunction: {
                'spring': 'var(--motion-spring)',
                'smooth': 'var(--motion-smooth)',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
export default config;
