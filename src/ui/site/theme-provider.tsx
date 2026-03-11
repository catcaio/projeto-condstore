'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggle: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

const STORAGE_KEY = 'condstore-site-theme';

function getInitialTheme(): Theme {
    if (typeof window === 'undefined') return 'dark';

    // 1. Stored preference
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* SSR / blocked storage */ }

    // 2. System preference
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';

    // 3. Fallback
    return 'dark';
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark'); // SSR-safe default
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTheme(getInitialTheme());
        setMounted(true);
    }, []);

    const toggle = useCallback(() => {
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggle }}>
            <div
                className={`${theme === 'dark' ? 'site-dark' : 'site-light'} min-h-screen flex flex-col bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))]`}
                style={{ transition: mounted ? 'background-color 0.3s ease, color 0.3s ease' : 'none' }}
            >
                {children}
            </div>
        </ThemeContext.Provider>
    );
}
