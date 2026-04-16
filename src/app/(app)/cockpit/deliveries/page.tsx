import { requireSessionTenantMatch } from '../../../../infra/auth/tenant-route-guard';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Monitoramento de Entregas (GPS) - Condstore',
};

export default async function DeliveriesPage(props: {
    params: Promise<{ tenantId?: string }> | { tenantId?: string };
}) {
    // Boilerplate for Next 15 page component async param resolution
    const params = await props.params;
    // The following lines were removed as they are not needed with the new header and context.
    // const tenantIdParam = params?.tenantId;
    // In the (app)/cockpit route, tenantId is not in the URL param but inferred from auth context or session
    // For scaffolding, we check the session directly.
    // Wait, since this is Next.js Server Components, we can't inject `request`.
    // We should rely on a data fetching hook or the standard cockpit layout which enforces tenant session.
    // Let's create a visual UI placeholder for now.

    return (
        <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
            <header className="px-6 md:px-8 py-4 border-b border-[hsl(var(--border))]">
                <h2 className="text-lg font-medium">Monitoramento de Entregas</h2>
            </header>

            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Entregas em Andamento</h1>
                        <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm max-w-2xl">
                            Acompanhe em tempo real a frota e os entregadores utilizando a nova arquitetura de eventos (DOMINE).
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-sm overflow-hidden">
                    <div className="p-6 md:p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[hsl(var(--muted-foreground))]">
                                <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Monitoramento GPS (Em breve)</h3>
                        <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-6 text-sm md:text-base">
                            Esta página atuará como a "Torre de Controle" utilizando o novo engine de intake de eventos DOMINE. O mapa em tempo real será ativado na próxima fase de rollout.
                        </p>
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 border border-[hsl(var(--input))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] h-10 px-4 py-2 opacity-50 cursor-not-allowed">
                            Ativar API do Google Maps
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
