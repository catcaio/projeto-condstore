import { StatusChip } from '@/ui/foundation';
import type { LogisticsRecord, LogisticsStatus } from '../mock-data';

function getStatusTone(status: LogisticsStatus) {
    if (status === 'excecao' || status === 'atrasado') {
        return 'critical' as const;
    }
    if (status === 'simulado' || status === 'aguardando-aprovacao') {
        return 'warning' as const;
    }
    if (status === 'entregue') {
        return 'success' as const;
    }
    return 'info' as const;
}

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

export function LogisticsSummary({ item }: { item: LogisticsRecord }) {
    return (
        <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">Resumo logistico</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[hsl(var(--ui-text))]">
                        {item.id}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">
                        Pedido #{item.order.id} • {item.order.customer.company} • {item.reference}
                    </p>
                </div>
                <StatusChip label={item.status} tone={getStatusTone(item.status)} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCell label="Pedido relacionado" value={`#${item.order.id}`} />
                <InfoCell label="Cliente" value={item.order.customer.company} />
                <InfoCell label="Transportadora" value={item.carrier} />
                <InfoCell label="Modalidade" value={item.mode} />
                <InfoCell label="Origem / destino" value={`${item.origin} -> ${item.destination}`} />
                <InfoCell label="Prazo prometido" value={item.promisedAt} />
            </div>
        </div>
    );
}
