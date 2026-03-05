'use client';

import * as React from 'react';
import { VisibleSala } from '@/modules/cockpit/launcher/tiles.service';
import { SalaSection } from './SalaSection';
import { cn } from '@/lib/utils';

interface LauncherGridProps {
    salas: VisibleSala[];
    tvMode?: boolean;
}

export function LauncherGrid({ salas, tvMode = false }: LauncherGridProps) {
    if (!salas || salas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-lg font-medium text-[hsl(var(--ui-text))]">Nenhum acesso concedido</h3>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-2 max-w-sm">
                    Seu perfil atual não possui permissão para acessar os módulos do Cockpit.
                    Contate um administrador se isso for um erro.
                </p>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col gap-8 w-full mx-auto px-2 sm:px-6 transition-all duration-300",
            tvMode ? "max-w-[1920px]" : "max-w-6xl"
        )}>
            {salas.map((sala) => (
                <SalaSection key={sala.id} sala={sala} tvMode={tvMode} />
            ))}
        </div>
    );
}
