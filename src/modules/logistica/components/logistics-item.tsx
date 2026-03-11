import { StatusChip } from '@/ui/foundation';
import type { LogisticsPriority, LogisticsRecord, LogisticsStatus } from '../mock-data';

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

function getPriorityTone(priority: LogisticsPriority) {
    if (priority === 'critica') {
        return 'critical' as const;
    }
    if (priority === 'alta') {
        return 'warning' as const;
    }
    if (priority === 'media') {
        return 'info' as const;
    }
    return 'neutral' as const;
}

function getSlaTone(label: string) {
    if (label === 'SLA rompido') {
        return 'critical' as const;
    }
    if (label === 'SLA atendido') {
        return 'success' as const;
    }
    return 'info' as const;
}

export function LogisticsItem({
    item,
    selected,
    onSelect,
}: {
    item: LogisticsRecord;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full rounded-[1.25rem] border p-4 text-left transition-colors ${selected ? 'border-[hsl(var(--ui-accent-blue)/0.24)] bg-[hsl(var(--ui-accent-blue)/0.08)]' : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface))]'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.id}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        {item.reference}
                    </p>
                </div>
                {item.hasException ? <StatusChip label="excecao" tone="critical" /> : null}
            </div>

            <div className="mt-3 text-sm text-[hsl(var(--ui-text-muted))]">
                <p>{item.order.customer.company}</p>
                <p className="mt-1">Pedido #{item.order.id} • {item.carrier} • {item.mode}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip label={item.status} tone={getStatusTone(item.status)} />
                <StatusChip label={item.priority} tone={getPriorityTone(item.priority)} />
                <StatusChip label={item.slaLabel} tone={getSlaTone(item.slaLabel)} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Aging</p>
                    <p className="mt-1 font-semibold text-[hsl(var(--ui-text))]">{item.aging}</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Prazo</p>
                    <p className="mt-1 font-semibold text-[hsl(var(--ui-text))]">{item.promisedAt}</p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                <span>{item.region}</span>
                <span>{item.updatedAt}</span>
            </div>
        </button>
    );
}
