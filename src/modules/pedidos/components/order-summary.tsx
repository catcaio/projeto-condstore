import { StatusChip } from '@/ui/foundation';
import type { OrderRecord, OrderStatus } from '../mock-data';

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

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

export function OrderSummary({ order }: { order: OrderRecord }) {
    return (
        <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">Resumo do pedido</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[hsl(var(--ui-text))]">
                        Pedido #{order.id}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">
                        {order.customer.company} • {order.origin}
                    </p>
                </div>
                <StatusChip label={order.status} tone={getStatusTone(order.status)} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCell label="Cliente" value={order.customer.company} />
                <InfoCell label="Valor" value={order.total} />
                <InfoCell label="Origem" value={order.origin} />
                <InfoCell label="Data" value={order.createdAt} />
                <InfoCell label="Owner" value={order.owner} />
                <InfoCell label="Canal" value={order.channel} />
            </div>
        </div>
    );
}
