import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { FreightSimulationOption } from '../mock-data';

function getTone(decision: FreightSimulationOption['decision']) {
    if (decision === 'escolhida') {
        return 'success' as const;
    }
    if (decision === 'em-analise') {
        return 'warning' as const;
    }
    return 'neutral' as const;
}

export function FreightSimulations({ items }: { items: FreightSimulationOption[] }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Simulacoes de frete"
                description="Opcoes recentes comparadas por valor, prazo, transportadora e decisao tomada."
            />
            <div className="mt-4 space-y-3">
                {items.map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.id}</p>
                                <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">
                                    {item.carrier} • {item.mode}
                                </p>
                            </div>
                            <StatusChip label={item.decision} tone={getTone(item.decision)} />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-[hsl(var(--ui-text))]">{item.value}</span>
                            <span className="text-[hsl(var(--ui-text-muted))]">{item.eta}</span>
                        </div>
                    </div>
                ))}
            </div>
        </SurfacePanel>
    );
}
