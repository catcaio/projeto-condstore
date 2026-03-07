'use client';

import * as React from 'react';
import { VisibleSala } from '@/modules/cockpit/launcher/tiles.service';
import { DashboardSection } from './DashboardSection';

interface DashboardGridProps {
    salas: VisibleSala[];
}

export function DashboardGrid({ salas }: DashboardGridProps) {
    if (!salas || salas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] mb-4">
                    <span className="text-3xl">🔐</span>
                </div>
                <h3 className="text-lg font-semibold text-[hsl(var(--ui-text))]">Nenhum acesso concedido</h3>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-2 max-w-sm">
                    Seu perfil atual não possui permissão para acessar os módulos do Cockpit.
                    Contate um administrador se isso for um erro.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 w-full">
            {salas.map((sala) => (
                <DashboardSection key={sala.id} sala={sala} />
            ))}
        </div>
    );
}
