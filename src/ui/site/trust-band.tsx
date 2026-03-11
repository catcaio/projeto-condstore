import { PageContainer } from './page-container';

const metrics = [
    { value: '+10', label: 'anos de operação no setor' },
    { value: '+10.000', label: 'clientes atendidos' },
    { value: 'Brasil', label: 'operações em todo o país' },
    { value: 'Público + Privado', label: 'empresas e órgãos atendidos' },
];

const logos = [
    'Petrobras',
    'WEG',
    'Prefeituras',
    'Administradoras',
    'Construtoras',
    'Condomínios',
];

export function TrustBand() {
    return (
        <section className="border-t border-b border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.15)] py-12 md:py-16">
            <PageContainer>
                {/* Metrics row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 mb-10 md:mb-12">
                    {metrics.map((m) => (
                        <div key={m.label} className="text-center">
                            <span className="block text-2xl md:text-3xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                                {m.value}
                            </span>
                            <span className="block text-xs md:text-sm text-[hsl(var(--ui-text-muted))] mt-1">
                                {m.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Logo placeholders */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {logos.map((name) => (
                        <div
                            key={name}
                            className="flex h-14 items-center justify-center rounded-xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.3)]"
                        >
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                                {name}
                            </span>
                        </div>
                    ))}
                </div>
            </PageContainer>
        </section>
    );
}
