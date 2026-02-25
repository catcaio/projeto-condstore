'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { Button } from '@/ui/components';
import { useTheme } from './theme-provider';

const labels = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
} as const;

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  const Icon = theme === 'system' ? Laptop : theme === 'light' ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={`Alternar tema (atual: ${labels[theme]})`}
      title={`Tema: ${labels[theme]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
