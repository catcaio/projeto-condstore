'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
    const { theme, toggle } = useTheme();

    return (
        <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.5)] text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-elevated)/0.6)] transition-all backdrop-blur-sm"
        >
            {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
        </button>
    );
}
