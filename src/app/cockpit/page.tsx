import { CockpitMetrics } from './_components/CockpitMetrics';

export default function CockpitPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--cockpit-text))]">
                    Cockpit
                </h1>
                <div className="bg-[hsl(var(--cockpit-surface))] border border-[hsl(var(--cockpit-border))] rounded px-3 py-1.5 text-xs text-[hsl(var(--cockpit-text-muted))]">
                    Ultima atualização: Agora
                </div>
            </div>

            {/* Real metrics grid — fetches from /api/cockpit/metrics (skeleton + error states) */}
            <CockpitMetrics />

            {/* Recent Activity Mock */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[hsl(var(--cockpit-border))] flex justify-between items-center">
                        <h3 className="font-semibold text-[hsl(var(--cockpit-text))]">
                            Atividade Recente
                        </h3>
                        <span className="text-xs text-[hsl(var(--cockpit-accent))] cursor-pointer hover:underline">
                            Ver tudo
                        </span>
                    </div>
                    <div className="divide-y divide-[hsl(var(--cockpit-border))]">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="px-6 py-3 flex items-center justify-between hover:bg-[hsl(var(--cockpit-bg))]/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-[hsl(var(--cockpit-accent))]"></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-[hsl(var(--cockpit-text))]">
                                            Novo pedido via WhatsApp
                                        </span>
                                        <span className="text-xs text-[hsl(var(--cockpit-text-muted))]">
                                            Tenant: Lojacond • Ref: #ORD-{1000 + i}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs text-[hsl(var(--cockpit-text-muted))]">
                                    {i * 5} min atrás
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Status Mock */}
                <div className="rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] p-6 space-y-4">
                    <h3 className="font-semibold text-[hsl(var(--cockpit-text))] mb-4">
                        Status do Sistema
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[hsl(var(--cockpit-text-muted))]">Twilio Webhook</span>
                            <span className="text-[hsl(var(--cockpit-accent))]">Operacional</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[hsl(var(--cockpit-text-muted))]">Banco de Dados</span>
                            <span className="text-[hsl(var(--cockpit-accent))]">Operacional</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[hsl(var(--cockpit-text-muted))]">Redis Cache</span>
                            <span className="text-[hsl(var(--cockpit-accent))]">Operacional</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[hsl(var(--cockpit-text-muted))]">Motor de Frete</span>
                            <span className="text-[hsl(var(--cockpit-accent))]">Operacional</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[hsl(var(--cockpit-border))]">
                        <button className="w-full py-2 rounded border border-[hsl(var(--cockpit-border))] text-xs font-medium text-[hsl(var(--cockpit-text-muted))] hover:bg-[hsl(var(--cockpit-bg))] transition-colors">
                            Ver logs do sistema
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
