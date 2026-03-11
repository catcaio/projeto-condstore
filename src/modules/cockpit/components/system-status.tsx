import { EmptyState, SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { SystemStatusItem } from '../data/shared';
import { cockpitSystemStatus } from '../mock-data';

function mapStatus(status: SystemStatusItem['status']) {
    if (status === 'healthy') {
        return 'success' as const;
    }
    if (status === 'warning') {
        return 'warning' as const;
    }
    return 'critical' as const;
}

export function SystemStatusCard({ item }: { item: SystemStatusItem }) {
    return (
        <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.label}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        {item.source ?? 'status operacional'}
                    </p>
                </div>
                <StatusChip label={item.status} tone={mapStatus(item.status)} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{item.detail}</p>
        </div>
    );
}

export function SystemStatusPanel({ items = cockpitSystemStatus }: { items?: SystemStatusItem[] }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Status do sistema"
                description="Leitura operacional simples da saude da plataforma com diagnostico interno e status real de servicos criticos."
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {items.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-4">
                        <EmptyState
                            title="Sem status disponivel"
                            description="Nao foi possivel obter leitura operacional dos servicos criticos."
                        />
                    </div>
                ) : (
                    items.map((item) => <SystemStatusCard key={item.id} item={item} />)
                )}
            </div>
        </SurfacePanel>
    );
}
