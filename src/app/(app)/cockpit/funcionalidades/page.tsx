import * as React from 'react';
import { headers } from 'next/headers';
import { getVisibleTiles } from '@/modules/cockpit/launcher/tiles.service';
import { getUserPinsAction } from './actions';
import { PinManagerClient } from './pin-manager-client';
import { Badge } from '@/ui/components';
import { LayoutGrid, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Suas Funcionalidades - Condstore OS',
};

export default async function FuncionalidadesPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    if (!tenantId) return <div>Acesso negado</div>;
    const role = headersList.get('x-auth-role') || 'viewer';
    const isInternal = tenantId.startsWith('lojacond');

    // Fetch all tiles the user is authorized to view
    const { salas: visibleTiles } = await getVisibleTiles({ tenantId, role: role as any });

    // Group tiles into a flat list mapping from across all rooms (salas)
    const flatTiles = visibleTiles.flatMap((sala: any) => sala.tiles);

    // Fetch current user pinned tiles
    const pinnedIds = await getUserPinsAction();

    return (
        <div className="flex flex-col min-h-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-4">
                <Link
                    href="/cockpit"
                    className="inline-flex items-center text-sm font-medium text-[hsl(var(--ui-brand))] hover:text-opacity-80 transition-colors w-fit"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Voltar para o Início
                </Link>
                <div className="flex items-start justify-between border-b border-[hsl(var(--ui-border))] pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--ui-text))] flex items-center gap-3">
                            <LayoutGrid className="w-8 h-8 text-[hsl(var(--ui-brand))]" />
                            Suas Funcionalidades
                        </h1>
                        <p className="mt-2 text-base text-[hsl(var(--ui-text-muted))] max-w-2xl">
                            Configure seu painel principal. Fixe os módulos que você mais usa para acesso fácil e rápido através da barra lateral em dispositivos desktop ou através da tela principal no celular.
                        </p>
                    </div>
                </div>
            </header>

            <section className="bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))] overflow-hidden shadow-sm">
                <div className="p-6">
                    <PinManagerClient
                        availableTiles={flatTiles}
                        initialPinnedIds={pinnedIds}
                    />
                </div>
            </section>
        </div>
    );
}
