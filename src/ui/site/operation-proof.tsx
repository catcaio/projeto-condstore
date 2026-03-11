import { Users, Package, Truck, BarChart3, Zap } from 'lucide-react';
import { PageContainer } from './page-container';

const flowSteps = [
    { icon: Users, label: 'Cliente' },
    { icon: Package, label: 'Pedido' },
    { icon: Truck, label: 'Logística' },
    { icon: BarChart3, label: 'Operação' },
    { icon: Zap, label: 'Resultado' },
];

export function OperationProof() {
    return (
        <section className="py-16 md:py-24 border-t border-[hsl(var(--ui-border)/0.4)]">
            <PageContainer narrow>
                <div className="text-center mb-10 md:mb-12">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-muted))] mb-6">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--ui-success))] opacity-60" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(var(--ui-success))]" />
                        </span>
                        Operação real
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight mb-4">
                        Uma operação que já existe.
                    </h2>
                    <p className="text-base md:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl mx-auto">
                        A plataforma nasce de uma operação real. Mais de uma década lidando com logística, pedidos, atendimento e clientes em todo o Brasil — com empresas privadas e órgãos públicos.
                    </p>
                </div>

                {/* Flow illustration */}
                <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                    {flowSteps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.label} className="flex items-center gap-2 md:gap-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)]">
                                        <Icon className="h-5 w-5 md:h-6 md:w-6 text-[hsl(var(--ui-accent-blue))]" />
                                    </div>
                                    <span className="text-[10px] md:text-xs font-semibold text-[hsl(var(--ui-text-muted))]">
                                        {step.label}
                                    </span>
                                </div>
                                {i < flowSteps.length - 1 && (
                                    <div className="w-6 md:w-10 h-px bg-gradient-to-r from-[hsl(var(--ui-accent-blue)/0.4)] to-[hsl(var(--ui-accent-blue)/0.1)] mb-5" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </PageContainer>
        </section>
    );
}
