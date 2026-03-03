export default function SystemStatusPage() {
    return (
        <div className="mx-auto max-w-4xl py-12 px-6">
            <h1 className="text-3xl font-bold tracking-tight mb-4">Status do Sistema</h1>
            <p className="text-[hsl(var(--ui-text-muted))] mb-8">
                Acompanhe em tempo real a saúde dos módulos do CONDSTORE OS.
            </p>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 border border-[hsl(var(--ui-border))] rounded-lg bg-[hsl(var(--ui-surface))]">
                    <div>
                        <h3 className="font-semibold text-[hsl(var(--ui-text))]">API Core</h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">Serviços de roteamento e autenticação</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium text-green-600">Operacional</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-[hsl(var(--ui-border))] rounded-lg bg-[hsl(var(--ui-surface))]">
                    <div>
                        <h3 className="font-semibold text-[hsl(var(--ui-text))]">Motor de Cotações</h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">Conexão com as transportadoras</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium text-green-600">Operacional</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
