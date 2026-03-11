import { StatusChip } from '@/ui/foundation';
import type { OrderChannel, OrderPriority, OrderRecord, OrderStatus } from '../mock-data';

function getStatusTone(status: OrderStatus) {
    if (status === 'excecao') {
        return 'critical' as const;
    }
    if (status === 'recebido' || status === 'em-analise') {
        return 'warning' as const;
    }
    if (status === 'aprovado' || status === 'faturado') {
        return 'info' as const;
    }
    if (status === 'concluido') {
        return 'success' as const;
    }
    return 'neutral' as const;
}

function getPriorityTone(priority: OrderPriority) {
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

function getChannelTone(channel: OrderChannel) {
    if (channel === 'WhatsApp') {
        return 'success' as const;
    }
    if (channel === 'Portal') {
        return 'info' as const;
    }
    return 'neutral' as const;
}

export function OrderItem({
    order,
    selected,
    onSelect,
}: {
    order: OrderRecord;
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
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Pedido #{order.id}</p>
                    <p className="mt-1 truncate text-sm text-[hsl(var(--ui-text-muted))]">{order.customer.company}</p>
                </div>
                <p className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                    {order.updatedAt}
                </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip label={order.status} tone={getStatusTone(order.status)} />
                <StatusChip label={order.priority} tone={getPriorityTone(order.priority)} />
                <StatusChip label={order.channel} tone={getChannelTone(order.channel)} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Valor</p>
                    <p className="mt-1 font-semibold text-[hsl(var(--ui-text))]">{order.total}</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Aging</p>
                    <p className="mt-1 font-semibold text-[hsl(var(--ui-text))]">{order.aging}</p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                <span>{order.owner}</span>
                <span>{order.logistics.carrier}</span>
            </div>
        </button>
    );
}
