import { DeliveriesClient } from './deliveries-client';

export const metadata = {
    title: 'Monitoramento de Entregas - Condstore',
};

export default function DeliveriesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
            <header className="px-6 md:px-8 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="max-w-7xl mx-auto w-full">
                    <h2 className="text-lg font-medium">Monitoramento de Entregas</h2>
                </div>
            </header>

            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Fluxo Logístico</h1>
                        <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm max-w-2xl">
                            Acompanhe o status das etiquetas geradas e o trajeto das mercadorias em tempo real.
                        </p>
                    </div>
                </div>

                <DeliveriesClient />
            </main>
        </div>
    );
}

