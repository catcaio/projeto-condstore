'use client';

import * as React from 'react';
import { VisibleSala } from '@/modules/cockpit/launcher/tiles.service';
import { SalaSection } from './SalaSection';

interface LauncherGridProps {
    salas: VisibleSala[];
}

export function LauncherGrid({ salas }: LauncherGridProps) {
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
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto px-2 sm:px-6">
            {salas.map((sala) => (
                <SalaSection key={sala.id} sala={sala} />
            ))}
        </div>
    );
}
