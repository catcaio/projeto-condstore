'use client';

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    toggle: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

const STORAGE_KEY = 'condstore-site-theme';

function readStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark') return 'dark';
        if (stored === 'light') return 'light';
    } catch {
        /* storage blocked or disabled */
    }
    // Natural default is 'light', regardless of OS setting
    return 'light';
}

function subscribe(callback: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
}

export function SiteThemeScript() {
    const script = `(() => {
        try {
            var stored = localStorage.getItem('${STORAGE_KEY}');
            var theme = stored === 'dark' ? 'dark' : 'light';
            var root = document.documentElement;
            root.classList.remove('site-light', 'site-dark');
            root.classList.add(theme === 'dark' ? 'site-dark' : 'site-light');
            root.style.colorScheme = theme;
        } catch (e) {}
    })();`;
    return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
    // Synchronous external store reading to guarantee zero-flash and correct initial state
    const clientTheme = useSyncExternalStore(subscribe, readStoredTheme, () => 'light' as Theme);
    const [theme, setTheme] = useState<Theme>(clientTheme);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        setTheme(clientTheme);
    }, [clientTheme]);

    useEffect(() => {
        try {
            const root = document.documentElement;
            root.classList.remove('site-light', 'site-dark');
            root.classList.add(theme === 'dark' ? 'site-dark' : 'site-light');
            root.style.colorScheme = theme;
        } catch {
            /* noop */
        }
    }, [theme]);

    const toggle = useCallback(() => {
        setHasInteracted(true);
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try {
                window.localStorage.setItem(STORAGE_KEY, next);
            } catch {
                /* noop */
            }
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggle }}>
            <SiteThemeScript />
            <div
                className={`${theme === 'dark' ? 'site-dark' : 'site-light'} min-h-screen flex flex-col bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))]`}
                style={{
                    transition: hasInteracted ? 'background-color 0.3s ease, color 0.3s ease' : 'none',
                }}
            >
                {children}
            </div>
        </ThemeContext.Provider>
    );
}
