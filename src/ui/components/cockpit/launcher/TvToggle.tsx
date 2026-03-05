'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Tv, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/button';

export function TvToggle({ initialTvMode }: { initialTvMode: boolean }) {
    const router = useRouter();
    const [isTvMode, setIsTvMode] = React.useState(initialTvMode);

    const toggleMode = () => {
        const newValue = !isTvMode;
        setIsTvMode(newValue);
        document.cookie = `cs_tv=${newValue ? '1' : '0'}; path=/; max-age=31536000`; // 1 year expiration
        router.refresh();
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleMode}
            className={cn(
                "hidden md:flex gap-2 items-center text-xs font-medium px-3 py-1.5 h-8 rounded-full",
                isTvMode
                    ? "bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-accent-blue)/0.25)]"
                    : "text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-surface-hover))] hover:text-[hsl(var(--ui-text))]"
            )}
            title={isTvMode ? "Desativar Modo TV" : "Ativar Modo TV"}
        >
            {isTvMode ? (
                <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Modo Padrão</span>
                </>
            ) : (
                <>
                    <Tv className="w-3.5 h-3.5" />
                    <span>Modo TV</span>
                </>
            )}
        </Button>
    );
}
